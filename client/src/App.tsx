/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
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
import ProjectReport from "./pages/ProjectReport";
import ProjectReportPrint from "./pages/ProjectReportPrint";
import Invoices from "./pages/Invoices";
import InvoiceDetails from "./pages/InvoiceDetails";
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
import Notifications from "./pages/Notifications";
import Tasks from "./pages/Tasks";
import TaskDetails from "./pages/TaskDetails";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import GeneralReports from "./pages/GeneralReports";
import Approvals from "./pages/Approvals";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Home} />
      <Route path={"/reset-password/:token"} component={ResetPassword} />
      <Route path={"/change-password"} component={ChangePassword} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/clients"} component={Clients} />
      <Route path={"/clients/:id"} component={ClientDetails} />
      <Route path={"/projects"} component={Projects} />
      <Route path={"/projects/:id/report"} component={ProjectReport} />
      <Route path={"/print/projects/:id"} component={ProjectReportPrint} />
      <Route path={"/projects/:id"} component={ProjectDetails} />
      <Route path={"/invoices"} component={Invoices} />
      <Route path={"/invoices/:id"} component={InvoiceDetails} />
      <Route path={"/forms"} component={Forms} />
      <Route path={"/forms/new"} component={ClientFormNew} />
      <Route path={"/forms/:id"} component={FormDetails} />
      <Route path={"/change-orders"}>{() => <Redirect to="/forms?tab=change-orders" />}</Route>
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
      <Route path={"/reports"}>{() => <Redirect to="/accounting?tab=reports" />}</Route>
      <Route path={"/general-reports"} component={GeneralReports} />
      <Route path={"/approvals"} component={Approvals} />
      <Route path={"/notifications"} component={Notifications} />
      <Route path={"/tasks"}>{() => <Redirect to="/projects" />}</Route>
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
