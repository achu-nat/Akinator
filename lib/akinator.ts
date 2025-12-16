import pool from './db';

// TYPES
export interface Character {
  id: number;
  name: string;
  popularity: number;
  probability: number;
}

export interface Question {
  id: number;
  text: string;
}

// 1. INITIALIZE GAME: Calculate initial odds based on popularity
export function calculateInitialOdds(characters: any[]): Character[] {
  const totalPopularity = characters.reduce((sum, c) => sum + c.popularity, 0);
  return characters.map(c => ({
    id: c.id,
    name: c.name,
    popularity: c.popularity,
    probability: c.popularity / totalPopularity
  }));
}

// 2. UPDATE ODDS: Adjust probabilities based on user answer
export async function updateOdds(
  characters: Character[], 
  questionId: number, 
  answer: 'yes' | 'no'
): Promise<Character[]> {
  const stats = await pool.query(
    `SELECT character_id, yes_count, no_count FROM character_question_stats WHERE question_id = $1`,
    [questionId]
  );
  
  // Map stats for quick lookup
  const statMap = new Map();
  stats.rows.forEach((r: any) => statMap.set(r.character_id, r));

  let sumProb = 0;

  const updatedCharacters = characters.map(char => {
    const stat = statMap.get(char.id) || { yes_count: 1, no_count: 1 };
    const total = stat.yes_count + stat.no_count;
    
    // Likelihood: If user said YES, use (yes/total). If NO, use (no/total).
    let likelihood = answer === 'yes' 
      ? stat.yes_count / total 
      : stat.no_count / total;

    // Safety clamp
    if (likelihood === 0) likelihood = 0.01;

    const newProb = char.probability * likelihood;
    sumProb += newProb;
    
    return { ...char, probability: newProb };
  });

  // Normalize so probabilities add up to 1
  return updatedCharacters.map(c => ({
    ...c,
    probability: c.probability / sumProb
  }));
}

// 3. PICK BEST QUESTION: Find the question that splits the characters best
export async function getBestQuestion(
  characters: Character[], 
  excludedQuestionIds: number[]
): Promise<Question | null> {
  // Get potential questions (exclude ones we already asked)
  // We check only a subset (limit 50) for performance
  let queryText = 'SELECT id, text FROM questions';
  if (excludedQuestionIds.length > 0) {
    queryText += ` WHERE id NOT IN (${excludedQuestionIds.join(',')})`;
  }
  queryText += ' LIMIT 50';

  const questionsRes = await pool.query(queryText);
  
  if (questionsRes.rows.length === 0) return null;

  let bestQuestion = null;
  let minEntropy = Infinity;

  // Check entropy for each question
  for (const question of questionsRes.rows) {
    const statsRes = await pool.query(
      `SELECT character_id, yes_count, no_count FROM character_question_stats WHERE question_id = $1`,
      [question.id]
    );
    const statMap = new Map();
    statsRes.rows.forEach((r: any) => statMap.set(r.character_id, r));

    let entropy = 0;

    for (const char of characters) {
      const stat = statMap.get(char.id) || { yes_count: 1, no_count: 1 };
      const total = stat.yes_count + stat.no_count;
      
      const probYes = stat.yes_count / total;
      const probNo = stat.no_count / total;
      
      // Shannon Entropy formula weighted by character probability
      if (probYes > 0) entropy -= (probYes * Math.log2(probYes)) * char.probability;
      if (probNo > 0) entropy -= (probNo * Math.log2(probNo)) * char.probability;
    }

    if (entropy < minEntropy) {
      minEntropy = entropy;
      bestQuestion = question;
    }
  }

  return bestQuestion || questionsRes.rows[0];
}