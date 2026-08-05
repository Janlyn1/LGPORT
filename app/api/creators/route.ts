import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  createCreator,
  findDuplicate,
  listCreators,
  statusOptions,
  type Actor,
  type CreatorInput,
} from "@/app/api/_lib/creator-store";

async function actorFromRequest(payload?: CreatorInput): Promise<Actor> {
  const user = await getChatGPTUser();
  return {
    name: user?.displayName || payload?.savedByName || "Research Team",
    email: user?.email || payload?.savedByEmail || "",
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error";
}

export async function GET() {
  try {
    const creators = await listCreators();
    return Response.json({ creators, statuses: statusOptions() });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreatorInput;
    const duplicate = await findDuplicate(payload);
    if (duplicate) {
      return Response.json(
        { error: "Creator already exists.", duplicate },
        { status: 409 },
      );
    }

    const creator = await createCreator(payload, await actorFromRequest(payload));
    return Response.json({ creator }, { status: 201 });
  } catch (error) {
    const cause = error instanceof Error ? error.cause : null;
    return Response.json(
      {
        error: errorMessage(error),
        duplicate: cause && typeof cause === "object" ? cause : undefined,
      },
      { status: errorMessage(error).includes("required") ? 400 : 500 },
    );
  }
}
