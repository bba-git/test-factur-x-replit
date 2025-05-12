interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center md:hidden">
          <button className="p-1" onClick={toggleSidebar}>
            <span className="material-icons">menu</span>
          </button>
          <h1 className="ml-2 text-lg font-medium">InvoiceX</h1>
        </div>
        <div className="flex items-center md:ml-auto">
          <button className="p-2 rounded-full hover:bg-neutral">
            <span className="material-icons">notifications</span>
          </button>
          <button className="ml-2 p-2 rounded-full hover:bg-neutral">
            <span className="material-icons">help_outline</span>
          </button>
          <div className="ml-3 relative">
            <button className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                <span className="text-sm">AB</span>
              </div>
              <span className="material-icons ml-1">arrow_drop_down</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
