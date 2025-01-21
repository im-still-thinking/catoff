"use client"

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { localAPIClient } from "@/adapters/xhr";
import { useRouter } from 'next/navigation';

export default function ChallengeStatus() {
    const router = useRouter();
    const { id } = useParams();
    const [token, setToken] = useState()
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await localAPIClient.get(`/challenge/${id}`, {
                });
                setChallenge(res.data.challenge);
                setToken(res.data.token)
            } catch (error) {
                console.error('Error fetching status:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
    }, [id]);

    const handleResolve = async () => {
        setIsProcessing(true);

        try {
            const res = await localAPIClient.post(
                `/challenge/${challenge?.id}/resolve`,
                { token }
            );

            if (res.status === 200) {
                const { challenge: updatedChallenge, token: newToken } = res.data;
                setChallenge(updatedChallenge);
                router.replace(`/challenge/${updatedChallenge.id}/status?token=${encodeURIComponent(newToken)}`);
            }
        } catch (error) {
            console.error('Error resolving challenge:', error);
            alert("Failed to resolve the challenge. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-black font-semibold">Loading challenge status...</div>
            </div>
        );
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
                            disabled={isProcessing}
                            className={`w-full font-semibold p-3 rounded-lg transition-colors ${isProcessing
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-500 hover:bg-green-600'
                                } text-white`}
                        >
                            {isProcessing ? 'Processing...' : 'Resolve Challenge'}
                        </button>
                    )}

                    {isProcessing && (
                        <div className="text-center text-sm text-gray-600">
                            Please wait while we process your transaction...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}