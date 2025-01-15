"use client"

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { localAPIClient } from "@/adapters/xhr";
import { useRouter } from 'next/navigation';

export default function ChallengeStatus() {
    const router = useRouter();
    const { id } = useParams();
    const searchParams = useSearchParams();
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            const token = searchParams.get('token');

            if (!id || !token) return;

            try {
                const res = await localAPIClient.get(`/challenge/${id}`, {
                    headers: {
                        'token': token
                    }
                });
                setChallenge(res.data.challenge);
            } catch (error) {
                console.error('Error fetching status:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
    }, [id, searchParams]);

    const handleResolve = async () => {
        const token = searchParams.get('token');
        if (!challenge || !token) return;

        try {
            const res = await localAPIClient.post(
                `/challenge/${challenge.id}/resolve`,
                {
                    token: token
                },
            );

            if (res.status === 200) {
                // alert(res.data)
                // router.push(`/challenge/${challenge.id}/status?token=${encodeURIComponent(res.data.token)}`);
                router.replace(`/challenge/${challenge.id}/status?token=${encodeURIComponent(res.data.token)}`);
              } else {
                alert("Failed to resolve the challenge.");
              }
        } catch (error) {
            console.error('Error resolving challenge:', error);
        }
    };

    if (loading) {
        return <div className='text-black'>Loading...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4 text-black">Challenge Status</h1>
            {challenge && (
                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold text-black">Challenge Information</h2>
                        <p className='text-black'>Challenger: {challenge.playerA.tag}</p>
                        <p className='text-black'>Challengee: {challenge.playerB?.tag}</p>
                        <p className='text-black'>Wager Amount: {challenge.wagerAmount} SOL</p>
                        <p className='text-black'>Status: {challenge.status}</p>
                        {challenge.winner && <p className='text-black'>Winner: {challenge.winner}</p>}
                    </div>

                    {challenge.status === 'accepted' && (
                        <button
                            onClick={handleResolve}
                            className="w-full bg-green-500 text-white p-2 rounded"
                        >
                            Resolve Challenge
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
