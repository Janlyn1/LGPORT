import { getChatGPTUser } from "./chatgpt-auth";
import { CreatorDashboard } from "./CreatorDashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  return (
    <CreatorDashboard
      currentUser={{
        name: user?.displayName ?? "Research Team",
        email: user?.email ?? "",
      }}
    />
  );
}
