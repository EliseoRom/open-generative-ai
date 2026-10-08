/**
 * Layout for /agents/* pages.
 * The MuAPI key lives in sessionStorage / memory (never a JS cookie).
 */
export const metadata = {
  title: "Agent Chat — EliseoRom / Open Generative AI",
};

export default function AgentsLayout({ children }) {
  return (
    <div className="h-screen w-full overflow-hidden bg-black">
      {children}
    </div>
  );
}
