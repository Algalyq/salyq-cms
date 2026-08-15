import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ComparisonSection } from "@/components/ComparisonSection";
import { StepsSection } from "@/components/StepsSection";
import { FAQSection } from "@/components/FAQSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <ComparisonSection />
        <StepsSection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
}
