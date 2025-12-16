import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth';
import { updateOdds, getBestQuestion } from '@/lib/akinator';

export async function POST(req) {
    try {
        const user = authenticate(req);
        const { gameId, answer, previousQuestionId } = await req.json();

        // 1. Fetch current game state
        const gameRes = await pool.query(
            'SELECT current_odds, asked_questions, status FROM games WHERE id = $1', 
            [gameId]
        );
        
        if (gameRes.rows.length === 0) return NextResponse.json({error: 'Game not found'}, {status: 404});

        let characters = gameRes.rows[0].current_odds;
        let askedQuestions = gameRes.rows[0].asked_questions || [];

        // 2. Process Answer (if this isn't the first turn)
        if (answer && previousQuestionId) {
            characters = await updateOdds(characters, previousQuestionId, answer);
            askedQuestions.push(previousQuestionId);
            
            // Simple learning: record the answer for future games
            // (Note: In a real app, verify game completion before learning)
            await pool.query(
                 `UPDATE character_question_stats 
                  SET ${answer}_count = ${answer}_count + 1 
                  WHERE question_id = $1 AND character_id IN 
                  (SELECT id FROM characters)`, // Safety check
                 [previousQuestionId]
            );
        }

        // 3. Check for a Winner (Threshold > 80% certainty)
        const topCharacter = characters.reduce((prev, current) => 
            (prev.probability > current.probability) ? prev : current
        );

        // Guess if certainty is high OR we asked too many questions (e.g., 20)
        if (topCharacter.probability > 0.80 || askedQuestions.length >= 20) {
            return NextResponse.json({
                type: 'guess',
                character: topCharacter,
                probability: topCharacter.probability,
                gameId
            });
        }

        // 4. Get Next Question
        const nextQuestion = await getBestQuestion(characters, askedQuestions);

        if (!nextQuestion) {
             // Run out of questions? Guess the best one.
             return NextResponse.json({
                type: 'guess',
                character: topCharacter,
                gameId
            });
        }

        // 5. Save State
        await pool.query(
            'UPDATE games SET current_odds = $1, asked_questions = $2 WHERE id = $3',
            [JSON.stringify(characters), JSON.stringify(askedQuestions), gameId]
        );

        return NextResponse.json({
            type: 'question',
            question: nextQuestion,
            gameId
        });

    } catch (e) {
        console.error("Game Loop Error:", e);
        return NextResponse.json({ error: 'Game error' }, { status: 500 });
    }
}