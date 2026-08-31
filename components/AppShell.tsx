import { Nav } from "./Nav";
import { Footer } from "./Footer";

export function AppShell({
  children,
  dense = false,
  solid = true,
}: {
  children: React.ReactNode;
  dense?: boolean;
  solid?: boolean;
}) {
  return (
    <div className="min-h-screen">
      <Nav solid={solid} />
      {children}
      {!dense && <Footer />}
    </div>
  );
}
