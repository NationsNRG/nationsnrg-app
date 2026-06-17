const APPDIRECT_API_URL = process.env.APPDIRECT_API_URL!;
const APPDIRECT_API_KEY = process.env.APPDIRECT_API_KEY!;

export async function fetchAppDirect(query: string, variables?: any) {
  const response = await fetch(APPDIRECT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${APPDIRECT_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error("AppDirect API error");
  }

  return response.json();
}