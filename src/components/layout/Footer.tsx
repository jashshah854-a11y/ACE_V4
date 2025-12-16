export const Footer = () => {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-8 px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ACE – Autonomous Customer Intelligence
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by advanced AI analytics
          </p>
        </div>
      </div>
    </footer>
  );
};
