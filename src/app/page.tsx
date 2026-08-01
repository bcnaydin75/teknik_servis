import Hero from "@/components/Hero";
import TrackingQuery from "@/components/TrackingQuery";
import CustomerFooter from "@/components/CustomerFooter";
import CustomerThemeGuard from "@/components/CustomerThemeGuard";

export default function Home() {
  return (
    <CustomerThemeGuard>
    <div className="customer-page min-h-app bg-slate-50">
      <Hero />
      <TrackingQuery />
      <CustomerFooter />
    </div>
    </CustomerThemeGuard>
  );
}
