import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/edit/:id" element={<Editor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
