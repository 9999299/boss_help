import { useState } from 'react';

const JobAnalyzer = ({ onAnalyze, isLoading }) => {
  const [jobData, setJobData] = useState({
    jobDescription: '',
    skills: [],
    experience: '',
  });

  const handleExtractFromPage = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractContent',
      });

      if (response && response.content) {
        setJobData(response.content);
      }
    } catch (error) {
      console.error('提取页面内容失败:', error);
      alert('无法提取页面内容，请手动输入');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAnalyze(jobData);
  };

  return (
    <div className="job-analyzer">
      <h3>职位分析</h3>

      <button
        className="btn btn-secondary"
        onClick={handleExtractFromPage}
        disabled={isLoading}
      >
        从页面提取
      </button>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>职位描述：</label>
          <textarea
            value={jobData.jobDescription}
            onChange={(e) =>
              setJobData({ ...jobData, jobDescription: e.target.value })
            }
            placeholder="粘贴职位描述..."
            rows={6}
          />
        </div>

        <div className="form-group">
          <label>技能要求（逗号分隔）：</label>
          <input
            type="text"
            value={jobData.skills.join(', ')}
            onChange={(e) =>
              setJobData({
                ...jobData,
                skills: e.target.value.split(',').map((s) => s.trim()),
              })
            }
            placeholder="React, Vue, Node.js"
          />
        </div>

        <div className="form-group">
          <label>经验要求：</label>
          <input
            type="text"
            value={jobData.experience}
            onChange={(e) =>
              setJobData({ ...jobData, experience: e.target.value })
            }
            placeholder="3年以上开发经验"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading || !jobData.jobDescription}
        >
          {isLoading ? '分析中...' : '分析职位'}
        </button>
      </form>
    </div>
  );
};

export default JobAnalyzer;
