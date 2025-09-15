import { Navigation } from "@/components/Navigation";
import { HeroSection } from "@/components/HeroSection";
import { Dashboard } from "@/components/Dashboard";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ProjectOverview } from "@/components/ProjectOverview";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="w-full">
        <HeroSection />
        <Dashboard />
        <DocumentUpload />
        <ProjectOverview />
      </main>
    </div>
  );
};

export default Index;