
import { ProjectData, DeadRepoCandidate } from '../types';

export const fetchGithubInfo = async (repoUrl: string): Promise<ProjectData> => {
  // Regex to extract owner and repo name
  const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = repoUrl.match(regex);

  if (!match) {
    throw new Error("Invalid GitHub URL. Must be like https://github.com/owner/repo");
  }

  const owner = match[1];
  const repo = match[2].replace('.git', '');

  try {
    // FIX: Removed headers: { 'Cache-Control': 'no-cache' } to avoid CORS errors
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    
    if (!response.ok) {
        if (response.status === 404) throw new Error("Repository not found.");
        if (response.status === 403) throw new Error("GitHub API rate limit exceeded. Try again later.");
        throw new Error("Failed to fetch from GitHub.");
    }

    const data = await response.json();

    // Normalize URL to ensure uniqueness (The "Hash")
    const normalizedUrl = `https://github.com/${data.owner.login}/${data.name}`;

    const birthDateStr = new Date(data.created_at).toISOString().split('T')[0];
    let deathDateStr = new Date(data.pushed_at).toISOString().split('T')[0];

    // FIX: If birth and death are same day, check updated_at.
    // Sometimes a project has code pushed on day 1, but readme/settings updated later.
    // Use updated_at to show a more accurate "lifespan" if pushed_at is too early.
    if (birthDateStr === deathDateStr && data.updated_at) {
        const updatedDateStr = new Date(data.updated_at).toISOString().split('T')[0];
        if (updatedDateStr > deathDateStr) {
            deathDateStr = updatedDateStr;
        }
    }

    return {
      repoUrl: normalizedUrl,
      name: data.name,
      description: data.description || "No description provided.",
      language: data.language || "Unknown",
      stars: data.stargazers_count,
      forks: data.forks_count,
      birthDate: birthDateStr,
      deathDate: deathDateStr,
      owner: data.owner.login
    };
  } catch (error) {
    console.warn("GitHub Fetch failed.", error);
    throw error;
  }
};

export const scanForDeadRepos = async (username: string): Promise<DeadRepoCandidate[]> => {
  try {
    // Sort by updated to get most recent first, but we will filter manually
    // FIX: Removed headers: { 'Cache-Control': 'no-cache' } to avoid CORS errors
    const response = await fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=100`);
    
    if (!response.ok) {
        if (response.status === 404) throw new Error("User not found.");
        if (response.status === 403) throw new Error("GitHub API rate limit exceeded.");
        throw new Error("Failed to fetch user repos.");
    }

    const repos = await response.json();
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    const candidates: DeadRepoCandidate[] = repos
      .filter((repo: any) => {
        const lastPush = new Date(repo.pushed_at);
        return lastPush < sixMonthsAgo && !repo.archived; // Filter older than 6 months
      })
      .map((repo: any) => {
        const birthDateStr = new Date(repo.created_at).toISOString().split('T')[0];
        let deathDate = new Date(repo.pushed_at);
        let deathDateStr = deathDate.toISOString().split('T')[0];

        // Apply same fix for scanner: Fallback to updated_at if lifespan looks like 0 days
        if (birthDateStr === deathDateStr && repo.updated_at) {
            const updatedDate = new Date(repo.updated_at);
            if (updatedDate > deathDate) {
                deathDate = updatedDate;
                deathDateStr = updatedDate.toISOString().split('T')[0];
            }
        }

        const diffTime = Math.abs(now.getTime() - deathDate.getTime());
        const daysDead = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        return {
          repoUrl: repo.html_url, // API usually returns canonical URL
          name: repo.name,
          description: repo.description || "No description provided.",
          language: repo.language || "Unknown",
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          birthDate: birthDateStr,
          deathDate: deathDateStr,
          owner: repo.owner.login,
          daysDead
        };
      })
      .sort((a: DeadRepoCandidate, b: DeadRepoCandidate) => b.daysDead - a.daysDead); // Most dead first

    return candidates;

  } catch (error) {
    console.warn("Scan failed", error);
    throw error;
  }
};
