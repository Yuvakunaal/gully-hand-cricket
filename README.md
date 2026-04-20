# Gully Hand Cricket 🏏

A modern, highly interactive web application bringing the nostalgic game of "Hand Cricket" to your browser! Built with stunning glassmorphism aesthetics, fluid micro-animations, and real-time multiplayer capabilities, this app lets you relive the classic school-day game with a premium digital experience.

## ✨ Features

* **Multiplayer Lobbies:** Create private rooms, share your custom room code with a friend, and play real-time multiplayer Hand Cricket using websockets.
* **Play vs Bot (Stockfish-Level):** Don't have a friend online? Play against our incredibly advanced bot. This isn't just random number generation—the bot uses game theory to actively adapt and beat you (see the Bot Working Principle below).
* **Realistic Toss Mechanism:** A highly polished interactive coin toss phase to decide who bats or bowls first.
* **Beautiful UI/UX:** A rich, immersive design featuring glassmorphism elements, dynamic scoreboards, smooth number animations, and responsive mobile-first layouts.
* **Animated Hands:** Visual representations of your "runs" (1-6) using custom colored hand assets.
* **Progressive Web App (PWA):** Install the game directly to your mobile home screen for a native, full-screen app experience.

## 🤖 The "Stockfish" Bot Working Principle

The AI opponent in Gully Hand Cricket isn't just picking random numbers. It employs a two-layer advanced strategy engine, heavily inspired by modern chess engines like Stockfish and self-learning algorithms.

### 1. The Game Theory Core (Nash Equilibrium)
The foundation of the bot is built on strict **Game Theory**. It uses dynamic programming and backward induction to solve for the exact mathematical **Nash Equilibrium** for *every single ball*.
* **In the Chase (Inning 2):** The bot calculates exactly how many runs are required and how many balls are left. It evaluates a 6x6 zero-sum payoff matrix to determine the precise optimal probability distribution to maximize its own win percentage. It even mathematically understands when it is optimal to "play for a tie" on the final ball.
* **Setting a Target (Inning 1):** The bot maximizes its expected runs by mixing high-yield and low-risk numbers mathematically, guaranteeing the highest possible mathematical expected value without unnecessarily sacrificing its wicket.

### 2. Adaptive Player Profiling (Exploitative Strategy)
Perfect math assumes it's playing against another perfect computer. But humans have biases! To make the bot feel superhuman and extremely tough, an **Adaptive Profiling Module** sits on top of the math engine:
* The bot actively tracks a history of every move you make during the match.
* It uses mathematical smoothing to build an empirical distribution of your personal habits (e.g., "This player spams 6 when under pressure" or "This player never plays 1").
* It dynamically blends the perfect Nash Equilibrium probabilities with an Exploitative strategy that actively counters your specific playstyle in real-time. 
* **If it's bowling**, it predicts your highest-value likely move and targets it to get you out. 
* **If it's batting**, it predicts what you're likely to bowl and actively avoids it to survive. 

The longer the match goes on, the harder the bot tries to exploit your predictability!

## 🚀 Tech Stack

* **Frontend:** React.js, Vanilla CSS (Premium Glassmorphism Design), Vite
* **Backend:** Node.js, Express, Socket.io (for robust real-time multiplayer)
* **Assets:** Custom image processing (AI) and responsive design



---
Get ready to test your luck and strategy. Can you beat the Stockfish of Hand Cricket? 🏆
