"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { TopNav } from "@/components/top-nav/TopNav";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
// import confetti from "@/lottie/confetti.json";
import { VocabularyProvider } from "@/app/(app)/_providers/Vocabulary";
import LottieAnimation from "@/components/lottie";
import confetti2 from "@/lottie/confetti2.json";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const defaultOptions = {
  loop: false,
  autoplay: true,
  animationData: confetti2,
  rendererSettings: {
    preserveAspectRatio: "xMidYMid slice",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showConfetti, setShowConfetti] = useState(false);
  const pathname = usePathname();
  const isBookingWow = pathname === "/student/booking-wow";

  useEffect(() => {
    const alreadyShown = localStorage.getItem("confettiShown");
    if (!alreadyShown) {
      setShowConfetti(true);
      localStorage.setItem("confettiShown", "true");
    }
  }, []);

  if (isBookingWow) {
    return (
      <div className="w-full min-h-screen bg-slate-50">
        <VocabularyProvider>{children}</VocabularyProvider>
      </div>
    );
  }

  return (
    <SidebarProvider>
      {showConfetti && (
        <LottieAnimation
          options={defaultOptions}
          className="absolute bottom-5 z-[2]"
          isActive
          name="confetti"
        />
      )}

      <AppSidebar />
      <SidebarTrigger />

      <div className="mr-8 ml-2 w-full mb-8">
        <TopNav />
        <VocabularyProvider>{children}</VocabularyProvider>
      </div>
    </SidebarProvider>
  );
}
