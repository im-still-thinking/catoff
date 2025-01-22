/* eslint-disable @typescript-eslint/no-explicit-any */

"use client"

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { localAPIClient } from "@/adapters/xhr";
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import ErrorModal from '@/components/ErrorModal';

export default function ChallengeStatus() {
    const router = useRouter();
    const { id } = useParams();
    const [resolutionStatus, setResolutionStatus] = useState<{
        playerAResolved: boolean;
        playerBResolved: boolean;
    } | null>(null);
    const [token, setToken] = useState();
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const { publicKey } = useWallet();
    const [error, setError] = useState<{ isOpen: boolean; message: string }>({
        isOpen: false,
        message: ''
    });

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await localAPIClient.get(`/challenge/${id}/resolve`, {});
                setChallenge(res.data.challenge);
                setToken(res.data.token);
            } catch (error: any) {
                console.error('Error fetching status:', error);
                setError({
                    isOpen: true,
                    message: error.response?.data?.error.message || "Failed to fetch challenge status"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
    }, [id]);

    const handleResolve = async () => {
        if (!publicKey) {
            setError({
                isOpen: true,
                message: "Please connect your wallet first."
            });
            return;
        }

        setIsProcessing(true);

        try {
            const res = await localAPIClient.post(
                `/challenge/${challenge?.id}/resolve`,
                {
                    token,
                    resolverWallet: publicKey.toString()
                }
            );

            if (res.status === 200) {
                if (res.data.status === "waiting_for_resolution") {
                    setResolutionStatus({
                        playerAResolved: res.data.playerAResolved,
                        playerBResolved: res.data.playerBResolved
                    });
                } else {
                    const { challenge: updatedChallenge } = res.data;
                    setChallenge(updatedChallenge);
                    router.replace(`/challenge/${updatedChallenge.id}/status`);
                }
            }
        } catch (error: any) {
            console.error('Error resolving challenge:', error);
            setError({
                isOpen: true,
                message: error.response?.data?.error.message || "Failed to resolve the challenge. Please try again."
            });
        } finally {
            setIsProcessing(false);
        }
    };



    const handleCloseError = () => {
        setError({ isOpen: false, message: '' });
    };

    const canResolve = challenge?.status === 'accepted' &&
        (publicKey?.toString() === challenge?.playerA.wallet ||
            publicKey?.toString() === challenge?.playerB?.wallet);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-white font-supercell text-xl">
                    Loading challenge status...
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 flex flex-col items-center min-h-screen">
            <ErrorModal
                isOpen={error.isOpen}
                onClose={handleCloseError}
                message={error.message}
            />

            <h1 className="text-4xl font-bold mb-8 text-white font-supercell text-center mt-10">
                Challenge Status
            </h1>

            {challenge && (
                <div className="space-y-8 w-full flex flex-col items-center">
                    <div className="bg-white/10 font-supercell backdrop-blur-lg rounded-xl border-t-[1px] border-l-[1px] border-t-white/50 border-l-white/50 shadow-sm shadow-black p-8 w-[80%] text-center">
                        <h2 className="text-2xl font-semibold text-black pb-2 mb-6 border-b-[1px] border-b-white/50">
                            Challenge Information
                        </h2>
                        <p className='text-white text-xl mb-4'>
                            <span className='text-green-400'>Challenger:</span> #{challenge.playerA.tag}
                        </p>
                        <p className='text-white text-xl mb-4'>
                            <span className='text-green-400'>Challengee:</span> #{challenge.playerB?.tag}
                        </p>
                        <p className='text-white text-xl mb-4'>
                            <span className='text-green-400'>Wager Amount:</span> {challenge.wagerAmount} SOL
                        </p>
                        <p className='text-white text-xl mb-4'>
                            <span className='text-green-400'>Status:</span> {challenge.status}
                        </p>
                        {challenge.winner &&
                            <p className='text-white text-xl'>
                                <span className='text-green-400'>Winner:</span> #{challenge.winner}
                            </p>
                        }
                    </div>

                    {resolutionStatus && (
                        <div className="bg-white/10 font-supercell backdrop-blur-lg rounded-xl p-4 w-[80%] text-center">
                            <h3 className="text-xl text-white mb-4">Resolution Status</h3>
                            <p className="text-white mb-2">
                                Challenger: {resolutionStatus.playerAResolved ? '✅' : '❌'}
                            </p>
                            <p className="text-white">
                                Challengee: {resolutionStatus.playerBResolved ? '✅' : '❌'}
                            </p>
                            <p className="text-white/60 text-sm mt-4">
                                Both parties must resolve to complete the challenge
                            </p>
                        </div>
                    )}

                    {canResolve && (
                        <button
                            onClick={handleResolve}
                            disabled={isProcessing}
                            className="w-[80%] border-2 border-white rounded-xl font-supercell bg-green-500 text-white p-4 hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-xl"
                        >
                            {isProcessing ? 'Processing...' : 'Resolve Challenge'}
                        </button>
                    )}

                    {challenge.status === 'accepted' && !canResolve && (
                        <p className="text-center text-white/60 font-supercell text-lg">
                            Only challenge participants can resolve this challenge
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}