import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Invoices from "./pages/Invoices";
import Forms from "./pages/Forms";
import FormDetails from "./pages/FormDetails";
import Accounting from "./pages/Accounting";
import HR from "./pages/HR";
import EmployeeProfile from "./pages/EmployeeProfile";
import ActivityLog from "./pages/ActivityLog";
import Settings from "./pages/Settings";
import Fatore from "./pages/Fatore";
import Clinthope from "./pages/Clinthope";
import Modifications from "./pages/Modifications";
import AIAssistant from "./pages/AIAssistant";
import ClientFormNew from "./pages/ClientFormNew";
import ChangeOrders from "./pages/ChangeOrders";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Tasks from "./pages/Tasks";
import TaskDetails from "./pages/TaskDetails";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/clients"} component={Clients} />
      <Route path={"/clients/:id"} component={ClientDetails} />
      <Route path={"/projects"} component={Projects} />
      <Route path={"/projects/:id"} component={ProjectDetails} />
      <Route path={"/invoices"} component={Invoices} />
      <Route path={"/forms"} component={Forms} />
      <Route path={"/forms/:id"} component={FormDetails} />
      <Route path={"/change-orders"} component={ChangeOrders} />
      <Route path={"/accounting"} component={Accounting} />
      <Route path={"/hr"} component={HR} />
      <Route path={"/hr/employees/:id"} component={EmployeeProfile} />
      <Route path={"/audit-logs"} component={ActivityLog} />
      <Route path={"/fatore"} component={Fatore} />
      <Route path={"/clinthope"} component={Clinthope} />
      <Route path={"/forms/new"} component={ClientFormNew} />
      <Route path={"/modifications"} component={Modifications} />
      <Route path={"/ai-assistant"} component={AIAssistant} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/reports"} component={Reports} />
      <Route path={"/notifications"} component={Notifications} />
      <Route path={"/tasks"} component={Tasks} />
      <Route path={"/tasks/:id"} component={TaskDetails} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
