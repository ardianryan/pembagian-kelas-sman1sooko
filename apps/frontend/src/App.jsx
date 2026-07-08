import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StudentApp from './StudentApp';
import AdminApp from './AdminApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/back-office/*" element={<AdminApp />} />
        <Route path="/*" element={<StudentApp />} />
      </Routes>
    </BrowserRouter>
  );
}