import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Application landing page - Welcome interface for QuickBill Desk
 * @component
 * @returns {JSX.Element} Centered welcome message with responsive design
 */
const Index = () => {
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to QuickBill Desk</h1>
        <p className="text-xl text-muted-foreground">
          {isMobile 
            ? "Manage your invoices on the go" 
            : "Start managing your invoices efficiently and professionally"
          }
        </p>
      </div>
    </div>
  );
};

export default Index;
