import TopBar from "@/components/TopBar";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="p-4">{children}</main>
    </>
  );
}
