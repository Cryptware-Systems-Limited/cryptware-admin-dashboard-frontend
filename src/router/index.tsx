import { createBrowserRouter, Navigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Overview from "@/pages/Overview";
import Reports from "@/pages/Reports";
import Clients from "@/pages/Clients";
import ClientProfile from "@/pages/ClientProfile";
import GeographicCoverage from "@/pages/GeographicCoverage";
import InvoiceMonitoring from "@/pages/InvoiceMonitoring";
import InvoiceMonitoringDetail from "@/pages/InvoiceMonitoringDetail";
import AlertManagement from "@/pages/AlertManagement";
import Settings from "@/pages/Settings";
import SystemAdminRoute from "@/components/SystemAdminRoute";
import NotFound from "@/pages/NotFound";
import ChangePassword from "@/pages/ChangePassword";
import SubscriptionMonitoring from "@/pages/SubscriptionMonitoring";

export const router = createBrowserRouter([
  // Public
  { path: "/login", element: <Login /> },

  // Protected — must be authenticated with an admin role
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/change-password", element: <ChangePassword /> },
      {
        path: "/",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to="/overview" replace /> },
          { path: "overview", element: <Overview /> },
          { path: "reports", element: <Reports /> },
          { path: "clients", element: <Clients /> },
          { path: "clients/:id", element: <ClientProfile /> },
          { path: "geographic-coverage", element: <GeographicCoverage /> },
          { path: "invoice-monitoring", element: <InvoiceMonitoring /> },
          { path: "invoice-monitoring/:id", element: <InvoiceMonitoringDetail /> },
          { path: "invoice-alerts", element: <AlertManagement /> },
          { path: "pricing-billing/subscriptions", element: <SubscriptionMonitoring /> },
          {
            path: "settings",
            element: (
              <SystemAdminRoute>
                <Settings />
              </SystemAdminRoute>
            ),
          },
        ],
      },
    ],
  },

  { path: "*", element: <NotFound /> },
]);
