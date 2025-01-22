/* eslint-disable @typescript-eslint/no-explicit-any */

import { localAPIClient } from "@/adapters/xhr";
import AcceptChallengeForm from "@/components/AcceptChallengeForm";
import { redirect } from 'next/navigation';

async function getChallenge(id: string): Promise<any> {
  try {
    const response = await localAPIClient.get(`/challenge/${id}`);

    if (response.status !== 200) {
      // If the error is due to challenge not found or different state
      if (response.data?.error?.code === "CHALLENGE_NOT_FOUND" || 
          response.data?.error?.code === "CHALLENGE_INVALID_STATE") {
        redirect(`/challenge/${id}/status`); 
      }
      throw new Error("Failed to fetch challenge data.");
    }
    return { challenge: response.data.challenge, token: response.data.token };
  } catch (error) {
    if ((error as any)?.response?.data?.error?.code === "CHALLENGE_NOT_FOUND" || 
        (error as any)?.response?.data?.error?.code === "CHALLENGE_INVALID_STATE") {
      redirect(`/challenge/${id}/status`);
    }
    console.error("Error fetching challenge:", error);
    return null;
  }
}

export default async function ChallengePage({
  params,
} : any) {
  const { id } = await params;

  if (!id) {
    redirect('/');
  }

  const { challenge, token } = await getChallenge(id);

  if (!challenge) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4 text-white font-supercell text-center mt-10 ">Challenge Details</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Challenge not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col items-center min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-white font-supercell text-center mt-10">Challenge Details</h1>

      <div className="space-y-8 w-full flex flex-col items-center">
        <div className="bg-white/10 font-supercell backdrop-blur-lg rounded-xl border-t-[1px] border-l-[1px] border-t-white/50 border-l-white/50 shadow-sm shadow-black p-8 w-[80%] text-center ">
          <h2 className="text-2xl font-semibold text-black pb-2 mb-6 border-b-[1px] border-b-white/50">Challenge Information</h2>

          <p className='text-white text-xl mb-4'> <span className='text-green-400'>Challenger:</span> #{challenge.playerA.tag}</p>
          <p className='text-white text-xl'> <span className='text-green-400'>Wager Amount:</span> {challenge.wagerAmount} SOL</p>
        </div>

        <AcceptChallengeForm
          challenge={challenge}
          token={token}
        />
      </div>
    </div>
  );
}