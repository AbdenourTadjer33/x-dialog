import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { App } from "./App"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { PrimitiveProvider } from "@/lib/primitive"
import { PromiseLogProvider } from "@/lib/promise-log"
import { BackOfficeProvider } from "@/store/back-office"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <PromiseLogProvider>
          {/* above the dialog provider: dialogs read and write the same store */}
          <BackOfficeProvider>
            <PrimitiveProvider>
              <App />
            </PrimitiveProvider>
          </BackOfficeProvider>
        </PromiseLogProvider>
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
)
