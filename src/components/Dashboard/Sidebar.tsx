
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Settings,
  Home,
  History,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: MessageSquare, label: "AI Profit Chat", path: "/chat" },
    { icon: History, label: "Audit History", path: "/history" },
    { icon: Settings, label: "Settings", path: "/settings" },
    { icon: HelpCircle, label: "Support", path: "/support" },
  ];

  return (
    <div
      className={`relative min-h-screen bg-white border-r border-gray-200 transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-10 bg-white border border-gray-200 rounded-full p-1.5 hover:bg-gray-50 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        )}
      </button>

      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg animate-fadeIn">
              Profit Auditor
            </span>
          )}
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <item.icon className="w-5 h-5 text-gray-600" />
              {!collapsed && (
                <span className="animate-fadeIn">{item.label}</span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
