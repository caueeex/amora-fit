import { AnnouncementBar } from "@/components/loja/announcement-bar";
import { StoreFooter } from "@/components/loja/footer";
import { StoreHeader } from "@/components/loja/header";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AnnouncementBar />
      <StoreHeader />
      <main className="flex-1">{children}</main>
      <StoreFooter />
    </>
  );
}
