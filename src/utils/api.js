const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://your-vercel-app.vercel.app';

/**
 * 分析职位要求
 * @param {Object} jobData - 职位数据
 * @returns {Object} 分析结果
 */
export async function analyzeJob(jobData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobData }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API调用失败:', error);
    throw error;
  }
}

/**
 * 保存简历到本地存储
 * @param {Object} resume - 简历数据
 */
export async function saveResume(resume) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set({ resume }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 从本地存储加载简历
 * @returns {Object} 简历数据
 */
export async function loadResume() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(['resume'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result.resume || null);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}
