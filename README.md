# Solana Clash Royale Challenge

A decentralized application (dApp) built on the Solana blockchain that integrates the Clash Royale API to facilitate a competitive staking and gaming experience. Players can challenge each other, stake SOL tokens, and compete using their Clash Royale cards. The winner takes the rewards, bringing an exciting fusion of gaming and blockchain technology.

---

![Solana Clash Royale Challenge](https://images2.alphacoders.com/855/855974.jpg)

---

## Features

- *Challenge System*: Two players, a challenger and a challengee, register and stake an agreed amount of SOL tokens to initiate a challenge.
- *Clash Royale Integration*: Challenges are based on 8-card battles, utilizing the Clash Royale API for real-time game data.
- *Secure Staking*: Players stake SOL tokens before the challenge, which are held securely until the challenge resolves.
- *Winner Takes All*: The winner of the battle resolves the challenge and claims the staked SOL funds.
- *Unique Player Identification*: Registration is managed using players' Clash Royale Tag IDs for secure and unique identification.

---

## How It Works

1. *Register for a Challenge*:
   - Players register for a challenge using their Clash Royale Tag ID.
   - Both the challenger and the challengee stake an agreed amount of SOL tokens.

2. *Initiate the Battle*:
   - The battle is conducted using 8 cards selected by each player.
   - The game details are fetched and validated through the Clash Royale API.

3. *Resolve the Challenge*:
   - The winner is determined based on the battle results.
   - The winning player claims the staked SOL tokens, while the system updates the challenge status.

4. *Reward Distribution*:
   - Upon successful resolution, the winner receives the staked SOL tokens directly into their wallet.

---

## Tech Stack

- *Blockchain*: Solana (for staking and reward distribution)
- *Backend*: Next.js with TypeScript (for handling API integrations and dApp logic)
- *Clash Royale API*: For fetching and validating battle details
- *Wallet Integration*: Solana wallets for secure staking and fund distribution

---

## Installation

### Prerequisites
- Node.js and npm installed

### Steps

1. Clone the repository:
   bash
   git clone https://github.com/your-username/solana-clash-royale.git
   cd solana-clash-royale
   

2. Install dependencies:
   bash
   npm install
   

3. Set up environment variables:
   Create a .env file in the project root and add:
   env
   REDIS_URI=uri
  REDIS_PORT=port
  REDIS_USERNAME=username
  REDIS_PASSWORD=password
  CLASH_ROYALE_API=key
  NEXT_PUBLIC_SOLANA_RPC_URL=url
  JWT_SECRET=secret
  FIXIE_URL=url
   

4. Start the development server:
   bash
   npm run dev
   

5. Access the dApp:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage

1. Connect your Solana wallet to the dApp.
2. Register for a challenge by entering your Clash Royale Tag ID and staking the required amount of SOL tokens.
3. Compete in a Clash Royale battle.
4. Resolve the challenge to claim your winnings!

---

## Roadmap

- [ ] Add leaderboard functionality
- [ ] Implement advanced analytics for battles
- [ ] Introduce support for multi-player tournaments
- [ ] Add mobile app integration

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a new branch:
   bash
   git checkout -b feature-name
   
3. Commit your changes:
   bash
   git commit -m "Add a feature"
   
4. Push to the branch:
   bash
   git push origin feature-name
   
5. Open a pull request.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Acknowledgments

- The Solana ecosystem for its robust blockchain platform.
- Clash Royale for its engaging game and API.
- Open-source contributors for their tools and libraries.

---
