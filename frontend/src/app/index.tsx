import Providers from "@/app/providers";
import AppRouter from "@/app/router";

export default function App() {
  return (
    <div>
      <Providers>
        <AppRouter />
      </Providers>
    </div>
  );
}
