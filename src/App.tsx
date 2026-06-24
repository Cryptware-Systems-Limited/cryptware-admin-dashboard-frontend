import { RouterProvider } from "react-router-dom";
import { router } from "@/router";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontFamily: "inherit" },
          classNames: {
            toast: "font-sans text-sm",
            error: "!bg-red-950 !border-red-800 !text-red-200",
            success: "!bg-emerald-950 !border-emerald-800 !text-emerald-200",
          },
        }}
      />
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
