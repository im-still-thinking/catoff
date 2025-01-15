import { redirect } from 'next/navigation';
import { localAPIClient } from "@/adapters/xhr";
import AcceptChallengeForm from "@/components/AcceptChallengeForm";

async function getChallenge(id: string, token: string) {
  try {

    const response = await localAPIClient.get(`/challenge/${id}`, {
      headers: {
        'token': token
      }
    });
    if (response.status !== 200) {
      throw new Error("Failed to fetch challenge data.");
    }
    return response.data.challenge;
  } catch (error) {
    console.error("Error fetching challenge:", error);
    return null;
  }
}

interface PageProps {
  params: {
    id: string;
  };
  searchParams: {
    token?: string;
  };
}

export default async function ChallengePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = params;
  const token = searchParams.token;

  if (!id || !token) {
    redirect('/');
  }

  const challenge = await getChallenge(id, token);

  if (!challenge) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4 text-black">Challenge Details</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Challenge not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-black">Challenge Details</h1>
      
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-black">Challenge Information</h2>
          <p className='text-black'>Challenger: {challenge.playerA.tag}</p>
          <p className='text-black'>Wager Amount: {challenge.wagerAmount} SOL</p>
        </div>

        <AcceptChallengeForm 
          challenge={challenge}
          token={token}
        />
      </div>
    </div>
  );
}