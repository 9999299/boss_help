import React, { useState } from 'react'; // eslint-disable-line no-unused-vars

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

      if (!tab) {
        alert('无法获取当前标签页');
        return;
      }

      // 直接在页面上执行提取逻辑，不依赖 content script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          function extractJobDesc() {
            const markers = ['【岗位职责】', '【岗位要求】', '岗位职责', '岗位要求', '职位描述'];
            const body = document.body.innerText || '';

            // 尝试从标记位置提取
            const startIdx = markers.reduce((idx, m) => {
              const i = body.indexOf(m);
              return i !== -1 && (idx === -1 || i < idx) ? i : idx;
            }, -1);

            if (startIdx !== -1) {
              const endMarkers = ['郎启旭', '今日活跃', '去App', '工作地址', '查看更多', '前往App'];
              let endIdx = body.length;
              for (const m of endMarkers) {
                const i = body.indexOf(m, startIdx + 10);
                if (i !== -1 && i < endIdx) endIdx = i;
              }
              return body.slice(startIdx, endIdx).replace(/\s+/g, ' ').trim();
            }

            // 兜底：提取 body 文本的中间部分（跳过导航和底部）
            const text = body.replace(/\s+/g, ' ').trim();
            const jobStart = text.indexOf('职位描述');
            if (jobStart !== -1) {
              return text.slice(jobStart, jobStart + 2000).trim();
            }
            return text.slice(0, 2000);
          }

          function extractSkills(text) {
            const keywords = [
              'React', 'Vue', 'Angular', 'Node.js', 'TypeScript', 'JavaScript',
              'Python', 'Java', 'Go', 'Golang', 'Rust', 'C++', 'PHP',
              'Docker', 'Kubernetes', 'K8s', 'AWS', 'MySQL', 'PostgreSQL',
              'MongoDB', 'Redis', 'Elasticsearch', 'Git', 'Linux', 'Nginx',
              'gRPC', 'REST', '微服务', '分布式', 'CI/CD', 'Jenkins',
              '高并发', '高可用', '缓存', '消息队列', 'RabbitMQ', 'Kafka',
            ];
            const lower = text.toLowerCase();
            return keywords.filter(k => lower.includes(k.toLowerCase()));
          }

          function extractExp(text) {
            const m = text.match(/(\d+)[\s-]*\d*\s*年/) || text.match(/(\d+)\s*年以上/);
            return m ? m[1] + '年以上经验' : '经验要求未明确';
          }

          const text = document.body.innerText || '';
          const jobDesc = extractJobDesc();
          return {
            jobDescription: jobDesc,
            skills: extractSkills(text),
            experience: extractExp(text),
          };
        },
      });

      if (results && results[0] && results[0].result) {
        setJobData(results[0].result);
      } else {
        alert('未能获取页面内容，请手动输入');
      }
    } catch (error) {
      console.error('提取页面内容失败:', error);
      alert('提取失败: ' + (error.message || '未知错误') + '\n请手动输入');
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
