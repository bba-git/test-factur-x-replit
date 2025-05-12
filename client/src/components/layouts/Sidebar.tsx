import { Link, useLocation } from "wouter";

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  const navItems = [
    { path: "/", label: "Invoices", icon: "receipt" },
    { path: "/settings", label: "Settings", icon: "settings" },
    { path: "/company", label: "Company Profile", icon: "business" },
    { path: "/customers", label: "Customers", icon: "people" },
    { path: "/products", label: "Products", icon: "inventory" },
    { path: "/validation", label: "Validation", icon: "verified" },
    { path: "/help", label: "Help", icon: "help_outline" },
  ];

  return (
    <aside className={`w-64 bg-white shadow-md ${isOpen ? 'block' : 'hidden'} md:block`}>
      <div className="p-4 border-b">
        <h1 className="flex items-center text-xl font-medium text-primary">
          <span className="material-icons mr-2">description</span>
          InvoiceX
        </h1>
        <p className="text-xs text-neutral-dark mt-1">Factur-X/ZUGFeRD Compliant</p>
      </div>
      <nav className="py-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <a 
                  className={`flex items-center px-4 py-3 ${
                    isActive(item.path) 
                      ? "text-primary bg-blue-50" 
                      : "text-neutral-dark hover:bg-blue-50"
                  }`}
                >
                  <span className="material-icons mr-3">{item.icon}</span>
                  {item.label}
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
