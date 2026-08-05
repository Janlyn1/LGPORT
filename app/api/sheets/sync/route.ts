import { listCreators } from "@/app/api/_lib/creator-store";

export async function POST() {
  const creators = await listCreators();

  return Response.json({
    ok: true,
    mode: "ready",
    rowsPrepared: creators.length,
    message:
      "Google Sheets sync is wired as a backend endpoint. Add Google service credentials and a spreadsheet ID to push these rows with the Sheets API.",
    columns: [
      "Creator ID",
      "Full/Display Name",
      "TikTok Profile Link",
      "Follower Count",
      "Country",
      "Business Email",
      "Niche",
      "Bio",
      "Status",
      "Assigned To",
      "Saved By",
      "Date Saved",
      "Last Updated",
      "Contact Date",
      "Response Status",
      "Notes",
    ],
  });
}
