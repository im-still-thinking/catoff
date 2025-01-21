/* eslint-disable @typescript-eslint/no-explicit-any */

import { redirect } from 'next/navigation';
import { localAPIClient } from "@/adapters/xhr";
import AcceptChallengeForm from "@/components/AcceptChallengeForm";

async function getChallenge(id: string): Promise<any> {
  try {

    const response = await localAPIClient.get(`/challenge/${id}`);

    if (response.status !== 200) {
      throw new Error("Failed to fetch challenge data.");
    }
    return { challenge: response.data.challenge, token: response.data.token };
  } catch (error) {
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
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-white font-supercell text-center mt-10 ">Challenge Details</h1>

      <div className="space-y-6">
        <div className="bg-white/10 w-fit font-supercell backdrop-blur-lg h-full rounded-xl border-t-[1px] border-l-[1px] border-t-white/50 border-l-white/50 shadow-sm shadow-black p-4">
          <h2 className="text-lg font-semibold text-black pb-0 mb-4 border-b-[1px] border-b-white/50">Challenge Information</h2>

          <p className='text-white'> <span className='text-green-400'>Challenger:</span> #{challenge.playerA.tag}</p>
          <p className='text-white'> <span className='text-green-400'>Wager Amount:</span> {challenge.wagerAmount} SOL</p>
        </div>

        <AcceptChallengeForm
          challenge={challenge}
          token={token}
        />
      </div>
    </div>
  );
}