export interface Company {
  id: string
  name: string
  subdomain: string
  brand_color: string
  logo_url: string | null
  created_at: string
}

// PublicCompany is the unauthenticated brand info used to theme the login page.
export interface PublicCompany {
  name: string
  subdomain: string
  brand_color: string
  logo_url: string | null
}
