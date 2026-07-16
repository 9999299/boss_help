import { createRoot } from 'react-dom/client';
import '../styles/sidebar.css';

const Sidebar = () => {
  return (
    <div className="sidebar-container">
      <div className="header">
        <h1>AI Resume Generator</h1>
      </div>
      <div className="content">
        <p>欢迎使用AI简历生成器</p>
      </div>
    </div>
  );
};

// 渲染组件
const container = document.getElementById('sidebar-root');
if (container) {
  const root = createRoot(container);
  root.render(<Sidebar />);
}

export default Sidebar;
