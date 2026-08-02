// Command generate_cities_seed builds the pinned Russian city snapshot used by
// migration 023 from the official public GAR/FIAS API operated by the FTS.
// It keeps only active address objects whose official type is "City".
//
// Usage:
//
//	go run ./scripts/generate_cities_seed.go \
//	  -out internal/db/migrations/023_event_cities.up.sql
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	settingsURL       = "https://fias.nalog.ru/Home/GetSpasSettings?url=https%3A%2F%2Ffias.nalog.ru%2FSearch"
	sourceReleaseDate = "2026-07-17"
	sourceActualDate  = "2026-07-22"
	sourceURL         = "https://www.nalog.gov.ru/opendata/7707329152-fias/"
)

type city struct {
	id     string
	name   string
	region string
}

type settings struct {
	URL   string `json:"Url"`
	Token string `json:"Token"`
}

type address struct {
	ObjectID      int64           `json:"object_id"`
	ObjectLevelID int             `json:"object_level_id"`
	ObjectGUID    string          `json:"object_guid"`
	FullName      string          `json:"full_name"`
	Path          string          `json:"path"`
	IsActive      bool            `json:"is_active"`
	Hierarchy     []hierarchyItem `json:"hierarchy"`
}

type hierarchyItem struct {
	Name     string `json:"name"`
	TypeName string `json:"type_name"`
}

type addressResponse struct {
	Addresses []address `json:"addresses"`
}

type fiasClient struct {
	baseURL string
	token   string
	http    *http.Client
}

type crawlTask struct {
	item       address
	regionName string
}

func main() {
	output := flag.String("out", "", "output migration path")
	workers := flag.Int("workers", 32, "number of FIAS requests made concurrently")
	flag.Parse()
	if *output == "" {
		fatal(fmt.Errorf("-out is required"))
	}
	if *workers < 1 {
		fatal(fmt.Errorf("-workers must be positive"))
	}

	ctx := context.Background()
	client, err := newFIASClient(ctx)
	fatal(err)
	regions, err := client.addresses(ctx, map[string]any{"address_level": 1})
	fatal(err)

	jobs := make(chan crawlTask, 10000)
	cityResults := make(chan city)
	errResults := make(chan error, 1)
	visited := make(map[int64]struct{}, 5000)
	var visitedMu sync.Mutex
	markVisited := func(id int64) bool {
		visitedMu.Lock()
		defer visitedMu.Unlock()
		if _, exists := visited[id]; exists {
			return false
		}
		visited[id] = struct{}{}
		return true
	}
	var jobsWG sync.WaitGroup
	var workersWG sync.WaitGroup
	for range *workers {
		workersWG.Add(1)
		go func() {
			defer workersWG.Done()
			for task := range jobs {
				if isCity(task.item) {
					cityResults <- cityFromAddress(task.item, task.regionName)
				}
				if task.item.ObjectLevelID < 6 {
					children, err := client.addresses(ctx, map[string]any{
						"address_levels": []int{2, 3, 4, 5, 6},
						"address_type":   1,
						"path":           task.item.Path,
						"include_hist":   false,
					})
					if err != nil {
						select {
						case errResults <- fmt.Errorf("list descendants of %s: %w", task.item.FullName, err):
						default:
						}
					} else {
						for _, child := range children {
							if !child.IsActive || !markVisited(child.ObjectID) {
								continue
							}
							if child.ObjectLevelID >= 6 {
								if isCity(child) {
									cityResults <- cityFromAddress(child, task.regionName)
								}
								continue
							}
							jobsWG.Add(1)
							jobs <- crawlTask{item: child, regionName: task.regionName}
						}
					}
				}
				jobsWG.Done()
			}
		}()
	}
	for _, region := range regions {
		if region.IsActive && markVisited(region.ObjectID) {
			jobsWG.Add(1)
			jobs <- crawlTask{item: region, regionName: region.FullName}
		}
	}
	go func() {
		jobsWG.Wait()
		close(jobs)
		workersWG.Wait()
		close(cityResults)
	}()

	cities := make([]city, 0, 1200)
	for item := range cityResults {
		cities = append(cities, item)
	}
	select {
	case err := <-errResults:
		fatal(err)
	default:
	}

	seen := make(map[string]struct{}, len(cities))
	unique := cities[:0]
	for _, item := range cities {
		if _, exists := seen[item.id]; exists {
			continue
		}
		seen[item.id] = struct{}{}
		unique = append(unique, item)
	}
	cities = unique
	sort.Slice(cities, func(i, j int) bool {
		if cities[i].name == cities[j].name {
			return cities[i].region < cities[j].region
		}
		return cities[i].name < cities[j].name
	})

	fatal(writeMigration(*output, cities))
	fmt.Printf("wrote %d active FIAS cities to %s\n", len(cities), *output)
}

func newFIASClient(ctx context.Context) (*fiasClient, error) {
	httpClient := &http.Client{Timeout: 45 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, settingsURL, nil)
	if err != nil {
		return nil, fmt.Errorf("build FIAS settings request: %w", err)
	}
	response, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get FIAS settings: %w", err)
	}
	responseBody, readErr := io.ReadAll(response.Body)
	closeErr := response.Body.Close()
	if err := errors.Join(readErr, closeErr); err != nil {
		return nil, fmt.Errorf("read FIAS settings response: %w", err)
	}
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("get FIAS settings: status %s", response.Status)
	}
	var cfg settings
	if err := json.Unmarshal(responseBody, &cfg); err != nil {
		return nil, fmt.Errorf("decode FIAS settings: %w", err)
	}
	if cfg.URL == "" || cfg.Token == "" {
		return nil, fmt.Errorf("FIAS settings response has no URL or token")
	}
	return &fiasClient{baseURL: strings.TrimRight(cfg.URL, "/"), token: cfg.Token, http: httpClient}, nil
}

func (c *fiasClient) addresses(ctx context.Context, filter map[string]any) ([]address, error) {
	body, err := json.Marshal(filter)
	if err != nil {
		return nil, fmt.Errorf("encode FIAS filter: %w", err)
	}
	endpoint := c.baseURL + "/api/spas/v2.0/GetAddressItems"
	var lastErr error
	for attempt := 1; attempt <= 3; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
		if err != nil {
			return nil, fmt.Errorf("build FIAS request: %w", err)
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("master-token", c.token)
		response, err := c.http.Do(req)
		if err != nil {
			lastErr = err
			time.Sleep(time.Duration(attempt) * 250 * time.Millisecond)
			continue
		}
		responseBody, readErr := io.ReadAll(response.Body)
		closeErr := response.Body.Close()
		if err := errors.Join(readErr, closeErr); err != nil {
			lastErr = err
			continue
		}
		if response.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("status %s: %s", response.Status, strings.TrimSpace(string(responseBody)))
			time.Sleep(time.Duration(attempt) * 250 * time.Millisecond)
			continue
		}
		var decoded addressResponse
		if err := json.Unmarshal(responseBody, &decoded); err != nil {
			return nil, fmt.Errorf("decode FIAS response: %w", err)
		}
		return decoded.Addresses, nil
	}
	return nil, fmt.Errorf("FIAS request failed after retries: %w", lastErr)
}

func isCity(item address) bool {
	if !item.IsActive || item.ObjectGUID == "" || len(item.Hierarchy) == 0 {
		return false
	}
	return strings.EqualFold(item.Hierarchy[len(item.Hierarchy)-1].TypeName, "Город")
}

func cityFromAddress(item address, region string) city {
	leaf := item.Hierarchy[len(item.Hierarchy)-1]
	return city{id: item.ObjectGUID, name: leaf.Name, region: region}
}

func writeMigration(output string, cities []city) error {
	var sql strings.Builder
	sql.WriteString("-- Russian city catalog snapshot from the official GAR/FIAS public API.\n")
	fmt.Fprintf(&sql, "-- FTS release: %s; registry data current as of %s.\n", sourceReleaseDate, sourceActualDate)
	fmt.Fprintf(&sql, "-- Source: %s\n\n", sourceURL)
	sql.WriteString("CREATE TABLE IF NOT EXISTS cities (\n")
	sql.WriteString("    id        UUID PRIMARY KEY,\n")
	sql.WriteString("    name      TEXT NOT NULL,\n")
	sql.WriteString("    region    TEXT NOT NULL,\n")
	sql.WriteString("    is_active BOOLEAN NOT NULL DEFAULT TRUE\n")
	sql.WriteString(");\n\n")
	sql.WriteString("CREATE TEMP TABLE event_city_seed (LIKE cities INCLUDING DEFAULTS);\n\n")
	sql.WriteString("INSERT INTO event_city_seed (id, name, region, is_active) VALUES\n")
	for i, item := range cities {
		ending := ",\n"
		if i == len(cities)-1 {
			ending = "\n"
		}
		fmt.Fprintf(&sql, "    ('%s', '%s', '%s', TRUE)%s", item.id, quote(item.name), quote(item.region), ending)
	}
	sql.WriteString(";\n\n")
	sql.WriteString("INSERT INTO cities (id, name, region, is_active)\n")
	sql.WriteString("SELECT id, name, region, is_active FROM event_city_seed\n")
	sql.WriteString("WHERE TRUE\n")
	sql.WriteString("ON CONFLICT (id) DO UPDATE SET\n")
	sql.WriteString("    name = EXCLUDED.name,\n")
	sql.WriteString("    region = EXCLUDED.region,\n")
	sql.WriteString("    is_active = EXCLUDED.is_active;\n\n")
	sql.WriteString("UPDATE cities AS city\n")
	sql.WriteString("SET is_active = FALSE\n")
	sql.WriteString("WHERE NOT EXISTS (SELECT 1 FROM event_city_seed AS seed WHERE seed.id = city.id);\n\n")
	sql.WriteString("DROP TABLE event_city_seed;\n\n")
	sql.WriteString("ALTER TABLE events\n")
	sql.WriteString("    ADD COLUMN IF NOT EXISTS city_id UUID;\n\n")
	sql.WriteString("DO $$\n")
	sql.WriteString("BEGIN\n")
	sql.WriteString("    IF NOT EXISTS (\n")
	sql.WriteString("        SELECT 1 FROM pg_constraint\n")
	sql.WriteString("        WHERE conname = 'events_city_id_fkey'\n")
	sql.WriteString("          AND conrelid = 'events'::regclass\n")
	sql.WriteString("    ) THEN\n")
	sql.WriteString("        ALTER TABLE events\n")
	sql.WriteString("            ADD CONSTRAINT events_city_id_fkey FOREIGN KEY (city_id) REFERENCES cities(id);\n")
	sql.WriteString("    END IF;\n")
	sql.WriteString("END $$;\n\n")
	sql.WriteString("CREATE INDEX IF NOT EXISTS events_public_city_date_idx\n")
	sql.WriteString("    ON events (city_id, date_start)\n")
	sql.WriteString("    WHERE is_public = TRUE AND status = 'active';\n")
	return os.WriteFile(output, []byte(sql.String()), 0o644)
}

func quote(value string) string {
	return strings.ReplaceAll(value, "'", "''")
}

func fatal(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
