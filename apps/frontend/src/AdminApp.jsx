import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, DEFAULT_BRANDING } from './constants';
import { applyBrandingToDocument, fetchBranding, mergeBranding, resolveItSupportLabel, resolveLogoUrl } from './branding';

export default function AdminApp() {
  // App views: 'loading' | 'login' | 'dashboard'
  const [view, setView] = useState('loading');

  // Release config (for admin portal controls)
  const [targetDate, setTargetDate] = useState('');
  const [isOpened, setIsOpened] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Admin dashboard states
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminToken, setAdminToken] = useState(localStorage.getItem('sman1sooko_admin_token') || '');
  const [adminActiveTab, setAdminActiveTab] = useState('overview');
  const [adminDateInput, setAdminDateInput] = useState('');
  const [excelFile, setExcelFile] = useState(null);
  const [importStatus, setImportStatus] = useState('');
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [adminStats, setAdminStats] = useState({
    count: 0,
    boys: 0,
    girls: 0,
    classes: {},
    classCount: 0,
    peminatan: {},
    peminatanCount: 0,
  });
  const [classesList, setClassesList] = useState([]);
  const [peminatanList, setPeminatanList] = useState([]);

  // Admin student directory management
  const [studentsList, setStudentsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Student CRUD modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({
    urut: '',
    nipd: '',
    nisn: '',
    nama: '',
    jk: 'L',
    namawalas: '',
    peminatan: '',
    kelas: ''
  });

  // Feedback states
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [brandingForm, setBrandingForm] = useState({
    schoolName: DEFAULT_BRANDING.schoolName,
    schoolTagline: DEFAULT_BRANDING.schoolTagline,
    footerCopy: DEFAULT_BRANDING.footerCopy,
    itTeamLabel: DEFAULT_BRANDING.itTeamLabel,
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [portalSettings, setPortalSettings] = useState({ classmatesVisible: true });
  const logoSrc = resolveLogoUrl(logoPreview || branding.logoUrl);

  useEffect(() => {
    applyBrandingToDocument(branding, { portal: 'admin' });
  }, [branding]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    checkInitialSession();
  }, []);

  // Check backend server status & restore token-based session if possible
  const checkInitialSession = async () => {
    try {
      const countdownRes = await fetch(`${API_URL}/countdown`);
      const countdownData = await countdownRes.json();
      setTargetDate(countdownData.targetDate);
      setIsOpened(countdownData.isOpened);
      setAdminDateInput(countdownData.targetDate.substring(0, 16));
      if (countdownData.branding) {
        applyBrandingState(mergeBranding(countdownData.branding));
      } else {
        const publicBranding = await fetchBranding();
        applyBrandingState(publicBranding);
      }

      // 1. Restore Admin session if token exists
      const savedAdminToken = localStorage.getItem('sman1sooko_admin_token');
      if (savedAdminToken) {
        const verifyAdmin = await fetch(`${API_URL}/admin/me`, {
          headers: { 'Authorization': `Bearer ${savedAdminToken}` }
        });
        if (verifyAdmin.ok) {
          setAdminToken(savedAdminToken);
          setView('dashboard');
          fetchAdminStats(savedAdminToken);
          fetchAdminStudentsList(savedAdminToken, 1, '', '');
          fetchAdminBranding(savedAdminToken);
          fetchAdminPortalSettings(savedAdminToken);
          return;
        } else {
          localStorage.removeItem('sman1sooko_admin_token');
          setAdminToken('');
        }
      }

      setView('login');
    } catch {
      setError('Gagal terhubung ke API server.');
      setView('login');
    }
  };

  const applyBrandingState = (data) => {
    const merged = mergeBranding(data);
    setBranding(merged);
    setBrandingForm({
      schoolName: merged.schoolName,
      schoolTagline: merged.schoolTagline,
      footerCopy: merged.footerCopy,
      itTeamLabel: merged.itTeamLabel,
    });
    setLogoPreview(null);
    setLogoFile(null);
  };

  const fetchAdminBranding = async (token) => {
    try {
      const res = await fetch(`${API_URL}/admin/branding`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        applyBrandingState(data);
      }
    } catch {
      // keep current branding defaults
    }
  };

  const fetchAdminPortalSettings = async (token) => {
    try {
      const res = await fetch(`${API_URL}/admin/portal-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPortalSettings({
          classmatesVisible: data.classmatesVisible !== false,
        });
      }
    } catch {
      // keep current portal settings defaults
    }
  };

  const handleSavePortalSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/admin/portal-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(portalSettings),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan pengaturan portal.');

      setPortalSettings({
        classmatesVisible: result.classmatesVisible !== false,
      });
      setSuccessMsg(result.message || 'Pengaturan fitur portal berhasil disimpan.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandingFieldChange = (field, value) => {
    setBrandingForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoFileChange = (file) => {
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/admin/branding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(brandingForm),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan identitas portal.');

      applyBrandingState(result);
      setSuccessMsg(result.message || 'Identitas portal berhasil disimpan.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
      setError('Pilih file logo terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('logo', logoFile);

      const res = await fetch(`${API_URL}/admin/branding/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal mengunggah logo.');

      applyBrandingState(result);
      setSuccessMsg(result.message || 'Logo sekolah berhasil diunggah.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch administrator statistics
  const fetchAdminStats = async (token) => {
    try {
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAdminStats(data);
    } catch (err) {}
  };

  const fetchAdminClasses = async (token) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) setClassesList(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminPeminatan = async (token) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/peminatan`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) setPeminatanList(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const switchAdminTab = (tab) => {
    setAdminActiveTab(tab);
    setError('');
    if (tab === 'overview') fetchAdminStats(adminToken);
    if (tab === 'students') fetchAdminStudentsList(adminToken, 1, searchQuery, filterClass);
    if (tab === 'classes') fetchAdminClasses(adminToken);
    if (tab === 'peminatan') fetchAdminPeminatan(adminToken);
  };

  const goToStudentsByClass = (kelas) => {
    setFilterClass(kelas);
    setSearchQuery('');
    setCurrentPage(1);
    setAdminActiveTab('students');
    fetchAdminStudentsList(adminToken, 1, '', kelas);
  };

  // Fetch paginated student directory for admin table
  const fetchAdminStudentsList = async (token, page = 1, search = '', filterKls = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/students?page=${page}&limit=10&search=${encodeURIComponent(search)}&kelas=${encodeURIComponent(filterKls)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setStudentsList(result.data);
        setAvailableClasses(result.classes || []);
        setCurrentPage(result.pagination.page);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Admin login authentication
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUser.trim(), password: adminPass.trim() })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Username atau Password admin salah!');
      }

      localStorage.setItem('sman1sooko_admin_token', result.token);
      setAdminToken(result.token);
      setView('dashboard');
      setAdminActiveTab('overview');
      setAdminUser('');
      setAdminPass('');
      
      // Fetch fresh admin stats & list
      fetchAdminStats(result.token);
      fetchAdminStudentsList(result.token, 1, '', '');
      fetchAdminBranding(result.token);
      fetchAdminPortalSettings(result.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPasswordForm = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleOpenChangePassword = () => {
    resetPasswordForm();
    setError('');
    setSuccessMsg('');
    setShowChangePasswordModal(true);
  };

  const handleCloseChangePassword = () => {
    setShowChangePasswordModal(false);
    resetPasswordForm();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Semua kolom password wajib diisi.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password baru minimal 8 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal mengganti password.');

      handleCloseChangePassword();
      setSuccessMsg(result.message || 'Password admin berhasil diperbarui.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Admin session logout clearing
  const handleAdminLogout = () => {
    localStorage.removeItem('sman1sooko_admin_token');
    setAdminToken('');
    setAdminActiveTab('overview');
    setError('');
    setSuccessMsg('');
    setView('login');
  };

  // Save updated Countdown announcement target date
  const handleUpdateReleaseDate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      const isoDate = new Date(adminDateInput).toISOString();
      const res = await fetch(`${API_URL}/admin/config`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ date: isoDate })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal mengubah konfigurasi.');
      }

      setSuccessMsg('Konfigurasi rilis tanggal pengumuman berhasil diperbarui.');
      
      // Recheck status
      const countdownRes = await fetch(`${API_URL}/countdown`);
      const countdownData = await countdownRes.json();
      setTargetDate(countdownData.targetDate);
      setIsOpened(countdownData.isOpened);
    } catch (err) {
      setError(err.message);
    }
  };

  // Bypass system countdown trigger (force open or close portal)
  const handleBypassRelease = async (openState) => {
    setError('');
    setSuccessMsg('');
    try {
      const targetTime = openState 
        ? new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        : new Date(Date.now() + 3600000 * 24).toISOString(); // 24 hours from now

      const res = await fetch(`${API_URL}/admin/config`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ date: targetTime })
      });

      if (!res.ok) throw new Error('Gagal melakukan override rilis.');

      setSuccessMsg(openState ? 'Gerbang pengumuman berhasil DIBUKA secara manual.' : 'Gerbang pengumuman berhasil DITUTUP secara manual.');
      setAdminDateInput(targetTime.substring(0, 16));
      
      // Refresh configurations
      const countdownRes = await fetch(`${API_URL}/countdown`);
      const countdownData = await countdownRes.json();
      setTargetDate(countdownData.targetDate);
      setIsOpened(countdownData.isOpened);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownloadImportTemplate = async () => {
    setError('');
    setTemplateDownloading(true);

    try {
      const res = await fetch(`${API_URL}/admin/import/template`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(result.error || 'Gagal mengunduh template Excel.');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template-impor-murid-sman1sooko.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setSuccessMsg('Template Excel berhasil diunduh.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setTemplateDownloading(false);
    }
  };

  // Upload Excel sheets process
  const handleImportExcel = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      setError('Pilih file Excel terlebih dahulu.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setImportStatus('Memproses impor database...');
    setLoading(true);

    const formData = new FormData();
    formData.append('file', excelFile);

    try {
      const res = await fetch(`${API_URL}/admin/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: formData
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal mengimpor file.');
      }

      setSuccessMsg(result.message);
      setExcelFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      fetchAdminStats(adminToken);
      fetchAdminStudentsList(adminToken, 1, searchQuery, filterClass);
      if (adminActiveTab === 'classes') fetchAdminClasses(adminToken);
      if (adminActiveTab === 'peminatan') fetchAdminPeminatan(adminToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setImportStatus('');
    }
  };

  // Clear all student database contents
  const handleResetDatabase = async () => {
    if (!window.confirm('PERINGATAN! Anda akan menghapus seluruh data murid di database. Tindakan ini tidak dapat dibatalkan. Lanjutkan?')) {
      return;
    }

    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_URL}/admin/students`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal mereset database.');

      setSuccessMsg('Seluruh database murid berhasil dikosongkan.');
      fetchAdminStats(adminToken);
      fetchAdminStudentsList(adminToken, 1, '', '');
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle single student CRUD operations
  const openAddModal = () => {
    setStudentForm({
      urut: '',
      nipd: '',
      nisn: '',
      nama: '',
      jk: 'L',
      namawalas: '',
      peminatan: '',
      kelas: ''
    });
    setError('');
    setShowAddModal(true);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/students`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(studentForm)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setSuccessMsg('Murid baru berhasil ditambahkan.');
      setShowAddModal(false);
      fetchAdminStats(adminToken);
      fetchAdminStudentsList(adminToken, 1, searchQuery, filterClass);
      fetchAdminClasses(adminToken);
      fetchAdminPeminatan(adminToken);
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setStudentForm({
      urut: student.urut || '',
      nipd: student.nipd,
      nisn: student.nisn,
      nama: student.nama,
      jk: student.jk || 'L',
      namawalas: student.namawalas,
      peminatan: student.peminatan,
      kelas: student.kelas
    });
    setError('');
    setShowEditModal(true);
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/students/${selectedStudent.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(studentForm)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setSuccessMsg('Data murid berhasil diperbarui.');
      setShowEditModal(false);
      fetchAdminStats(adminToken);
      fetchAdminStudentsList(adminToken, currentPage, searchQuery, filterClass);
      fetchAdminClasses(adminToken);
      fetchAdminPeminatan(adminToken);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteStudent = async (id, name) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data murid: ${name}?`)) {
      return;
    }

    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_URL}/admin/students/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setSuccessMsg('Data murid berhasil dihapus.');
      fetchAdminStats(adminToken);
      fetchAdminStudentsList(adminToken, currentPage, searchQuery, filterClass);
      fetchAdminClasses(adminToken);
      fetchAdminPeminatan(adminToken);
    } catch (err) {
      setError(err.message);
    }
  };

  // Run directory queries
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setCurrentPage(1);
    fetchAdminStudentsList(adminToken, 1, val, filterClass);
  };

  const handleFilterClassChange = (e) => {
    const val = e.target.value;
    setFilterClass(val);
    setCurrentPage(1);
    fetchAdminStudentsList(adminToken, 1, searchQuery, val);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    fetchAdminStudentsList(adminToken, page, searchQuery, filterClass);
  };

  function renderChangePasswordModal() {
    const field = (label, input) => (
      <div className="flex flex-col gap-1.5">
        <label className="admin-form-label">{label}</label>
        {input}
      </div>
    );

    return (
      <div className="admin-modal-overlay animate-fadeIn">
        <div className="bento-card no-hover max-w-md w-full p-6 text-left shadow-2xl">
          <h3 className="text-title-lg text-primary flex items-center gap-2 border-b border-outline-variant pb-4 mb-5">
            <span className="material-symbols-outlined text-secondary">lock_reset</span>
            Ganti Password Admin
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {field('Password Saat Ini', (
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
                autoComplete="current-password"
                className="input-taktil input-taktil--sm"
              />
            ))}

            {field('Password Baru', (
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                className="input-taktil input-taktil--sm"
              />
            ))}

            {field('Konfirmasi Password Baru', (
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
                className="input-taktil input-taktil--sm"
              />
            ))}

            <div className="flex gap-3 pt-4 border-t border-outline-variant">
              <button type="button" onClick={handleCloseChangePassword} className="btn-ghost flex-1 !py-3">Batal</button>
              <button type="submit" disabled={loading} className="spring-button btn-primary flex-1 !min-h-0 !py-3 !text-body-md">
                {loading ? 'Menyimpan...' : 'Simpan Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderStudentModal(mode, title, icon, onSubmit, onClose) {
    const field = (label, input) => (
      <div className="flex flex-col gap-1.5">
        <label className="admin-form-label">{label}</label>
        {input}
      </div>
    );

    return (
      <div className="admin-modal-overlay animate-fadeIn">
        <div className="bento-card no-hover max-w-lg w-full p-6 text-left shadow-2xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-title-lg text-primary flex items-center gap-2 border-b border-outline-variant pb-4 mb-5">
            <span className="material-symbols-outlined text-secondary">{icon}</span>
            {title}
          </h3>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('Absen (URUT)', (
                <input type="text" value={studentForm.urut} onChange={(e) => setStudentForm({ ...studentForm, urut: e.target.value })} placeholder="Contoh: 1" className="input-taktil input-taktil--sm" />
              ))}
              {field('Jenis Kelamin', (
                <select value={studentForm.jk} onChange={(e) => setStudentForm({ ...studentForm, jk: e.target.value })} className="input-taktil input-taktil--sm cursor-pointer">
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('NISN (Wajib)', (
                <input type="text" value={studentForm.nisn} onChange={(e) => setStudentForm({ ...studentForm, nisn: e.target.value })} required maxLength={10} placeholder="0061234567" className="input-taktil input-taktil--sm" />
              ))}
              {field('NIPD (Wajib)', (
                <input type="text" value={studentForm.nipd} onChange={(e) => setStudentForm({ ...studentForm, nipd: e.target.value })} required placeholder="18765" className="input-taktil input-taktil--sm" />
              ))}
            </div>

            {field('Nama Lengkap Murid', (
              <input type="text" value={studentForm.nama} onChange={(e) => setStudentForm({ ...studentForm, nama: e.target.value })} required placeholder="ADITYA PRATAMA" className="input-taktil input-taktil--sm uppercase" />
            ))}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('Program Peminatan', (
                <input type="text" value={studentForm.peminatan} onChange={(e) => setStudentForm({ ...studentForm, peminatan: e.target.value })} required placeholder="MIPA" className="input-taktil input-taktil--sm" />
              ))}
              {field('Kelas Baru', (
                <input type="text" value={studentForm.kelas} onChange={(e) => setStudentForm({ ...studentForm, kelas: e.target.value })} required placeholder="XI-MIPA 4" className="input-taktil input-taktil--sm" />
              ))}
            </div>

            {field('Nama Guru Wali Kelas', (
              <input type="text" value={studentForm.namawalas} onChange={(e) => setStudentForm({ ...studentForm, namawalas: e.target.value })} required placeholder="Drs. Bambang Wijaya" className="input-taktil input-taktil--sm" />
            ))}

            <div className="flex gap-3 pt-4 border-t border-outline-variant">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 !py-3">Batal</button>
              <button type="submit" className="spring-button btn-primary flex-1 !min-h-0 !py-3 !text-body-md">
                {mode === 'add' ? 'Simpan Murid' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW RENDER HELPERS
  // ==========================================

  function renderAdminLoginView() {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-6 relative overflow-hidden w-full bg-background">
        <div className="absolute top-[-10%] left-[-10%] w-72 md:w-96 h-72 md:h-96 atmosphere-blob-primary opacity-30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-64 md:w-80 h-64 md:h-80 atmosphere-blob-secondary opacity-20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm relative z-10 animate-fadeIn">
          <div className="bento-card no-hover rounded-xl !p-6 md:!p-8 flex flex-col gap-6 text-center">
            <div className="flex justify-start">
              <Link
                to="/"
                onClick={() => setError('')}
                className="inline-flex items-center gap-1 text-body-md font-semibold text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Kembali ke Portal Murid
              </Link>
            </div>

            <div className="w-16 h-16 bg-secondary-container/20 rounded-2xl flex items-center justify-center mx-auto text-secondary">
              <span className="material-symbols-outlined text-3xl">lock</span>
            </div>

            <div className="text-center">
              <h1 className="text-headline-md text-primary tracking-tight">Admin Panel</h1>
              <p className="text-body-md text-on-surface-variant mt-1">{branding.schoolName} — Autentikasi Kurikulum</p>
            </div>

            <form onSubmit={handleAdminLogin} className="flex flex-col gap-4 text-left">
              {error && (
                <div className="p-3 bg-error-container border border-error/30 text-error text-body-md rounded-xl font-semibold">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-label-md text-on-surface-variant uppercase" htmlFor="adminUser">Username Admin</label>
                <div className="input-field">
                  <span className="input-field-icon material-symbols-outlined" aria-hidden="true">person</span>
                  <input
                    type="text"
                    id="adminUser"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    required
                    placeholder="Masukkan username..."
                    className="input-taktil input-taktil--lg input-taktil--icon"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-label-md text-on-surface-variant uppercase" htmlFor="adminPass">Password Admin</label>
                <div className="input-field">
                  <span className="input-field-icon material-symbols-outlined" aria-hidden="true">key</span>
                  <input
                    type="password"
                    id="adminPass"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    required
                    placeholder="Masukkan password..."
                    className="input-taktil input-taktil--lg input-taktil--icon"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button type="submit" className="spring-button btn-primary mt-2">
                <span>Masuk Administrator</span>
                <span className="material-symbols-outlined text-[1.25rem]" aria-hidden="true">login</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const ADMIN_NAV_ITEMS = [
    { tab: 'overview', icon: 'dashboard', label: 'Dashboard' },
    { tab: 'students', icon: 'groups', label: 'Daftar Murid' },
    { tab: 'classes', icon: 'class', label: 'Kelas & Guru Wali' },
    { tab: 'peminatan', icon: 'category', label: 'Program Peminatan' },
    { tab: 'import', icon: 'upload_file', label: 'Impor Data' },
    { tab: 'settings', icon: 'settings', label: 'Pengaturan' },
  ];

  const ADMIN_TAB_META = {
    overview: { kicker: 'Panel Administrator', title: 'Selamat Datang, Admin', desc: 'Ringkasan data murid, kelas, dan jadwal pengumuman portal.' },
    students: { kicker: 'Manajemen Data', title: 'Daftar Murid', desc: `Kelola database pembagian kelas murid ${branding.schoolName}.` },
    classes: { kicker: 'Struktur Kelas', title: 'Kelas & Guru Wali Kelas', desc: 'Monitoring kelas, guru wali kelas, dan distribusi murid.' },
    peminatan: { kicker: 'Program Peminatan', title: 'Data Program Peminatan', desc: 'Ringkasan program peminatan dan pembagian kelas per kelas.' },
    import: { kicker: 'Sinkronisasi', title: 'Impor Data Excel', desc: 'Unggah spreadsheet kurikulum untuk update massal.' },
    settings: { kicker: 'Konfigurasi', title: 'Pengaturan Sistem', desc: 'Identitas portal dan pemeliharaan database.' },
  };

  function renderAdminPageHeader(label, title, description) {
    return (
      <div className="admin-page-header">
        <span className="text-label-md text-secondary uppercase tracking-widest">{label}</span>
        <h2 className="text-headline-lg text-primary mt-1">{title}</h2>
        {description && <p className="text-body-md text-on-surface-variant mt-1 max-w-2xl">{description}</p>}
      </div>
    );
  }

  function renderAdminDashboardView() {
    const currentDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const sidebarLink = (tab, icon, label) => (
      <button
        type="button"
        onClick={() => switchAdminTab(tab)}
        className={`admin-nav-link ${adminActiveTab === tab ? 'active' : ''}`}
      >
        <span className={`material-symbols-outlined text-[20px] shrink-0 ${adminActiveTab === tab ? 'filled' : ''}`}>{icon}</span>
        <span className="min-w-0">{label}</span>
      </button>
    );

    return (
      <>
      <div className="admin-shell text-on-surface">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-brand flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 bg-white p-1.5 rounded-xl shadow-md">
              <img src={logoSrc} alt={`${branding.schoolName} Logo`} className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-title-lg text-white tracking-tight">Admin Panel</h1>
              <p className="text-secondary-fixed-dim text-[10px] uppercase tracking-widest mt-0.5">{branding.schoolName}</p>
            </div>
          </div>

          <nav className="admin-sidebar-nav">
            {ADMIN_NAV_ITEMS.map((item) => sidebarLink(item.tab, item.icon, item.label))}
          </nav>

          <div className="admin-sidebar-footer">
            <button type="button" onClick={handleAdminLogout} className="admin-btn-logout">
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Logout
            </button>
          </div>
        </aside>

        <main className="admin-main px-4 md:px-0 py-6 md:py-0 safe-bottom">
          <div className="admin-content-inner admin-canvas w-full">
          <header className="admin-topbar">
            {renderAdminPageHeader(
              ADMIN_TAB_META[adminActiveTab]?.kicker,
              ADMIN_TAB_META[adminActiveTab]?.title,
              ADMIN_TAB_META[adminActiveTab]?.desc
            )}
            <div className="admin-topbar-actions">
              <button
                type="button"
                onClick={handleOpenChangePassword}
                className="admin-topbar-password-btn"
                title="Ganti password admin"
              >
                <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                <span className="hidden sm:inline">Ganti Password</span>
              </button>
              <div className="admin-topbar-date">
                <span className="material-symbols-outlined text-secondary text-[20px]">calendar_today</span>
                <span className="text-label-md text-on-surface font-semibold">{currentDate}</span>
              </div>
            </div>
          </header>

          {error && (
            <div className="p-4 bg-error-container border border-error/30 text-error text-body-md rounded-xl flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">warning</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-secondary-fixed border border-secondary/20 text-on-secondary-fixed text-body-md rounded-xl flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] mt-0.5 filled shrink-0">check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          <div className="admin-page-body">
            {adminActiveTab === 'overview' && renderAdminOverview()}
            {adminActiveTab === 'students' && renderAdminStudents()}
            {adminActiveTab === 'classes' && renderAdminClasses()}
            {adminActiveTab === 'peminatan' && renderAdminPeminatan()}
            {adminActiveTab === 'import' && renderAdminImport()}
            {adminActiveTab === 'settings' && renderAdminSettings()}
          </div>

          <footer className="admin-site-footer text-on-surface-variant text-body-md">
            <div className="admin-site-footer-brand">
              <img src={logoSrc} alt="Logo Footer" className="admin-site-footer-logo" />
              <p>
                {branding.footerCopy}
              </p>
            </div>
            <a href="https://sman1sooko.sch.id" target="_blank" rel="noreferrer" className="admin-site-footer-link">Portal Sekolah</a>
          </footer>
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-t border-outline-variant shadow-[0_-4px_24px_rgba(0,10,61,0.08)] mobile-nav-bar px-2 py-2.5">
        <div className="admin-mobile-nav">
          {ADMIN_NAV_ITEMS.map((item) => (
            <button
              key={item.tab}
              type="button"
              onClick={() => switchAdminTab(item.tab)}
              className={`admin-mobile-nav-item ${adminActiveTab === item.tab ? 'active' : ''}`}
            >
              <span className={`material-symbols-outlined text-[22px] ${adminActiveTab === item.tab ? 'filled' : ''}`}>{item.icon}</span>
              <span className="mt-0.5">{item.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </nav>
      </>
    );
  }

  // ==========================================
  // TAB COMPONENT HELPERS FOR ADMIN DASHBOARD
  // ==========================================

  function renderAdminOverview() {
    const releaseDate = adminDateInput ? adminDateInput.split('T')[0] : '';
    const releaseTime = adminDateInput ? adminDateInput.split('T')[1] : '';

    const quickLinks = [
      { tab: 'students', icon: 'groups', label: 'Daftar Murid', desc: `${adminStats.count} murid terdaftar` },
      { tab: 'classes', icon: 'class', label: 'Kelas & Guru Wali', desc: `${adminStats.classCount || 0} kelas aktif` },
      { tab: 'peminatan', icon: 'category', label: 'Program Peminatan', desc: `${adminStats.peminatanCount || 0} program peminatan` },
      { tab: 'import', icon: 'upload_file', label: 'Impor Data', desc: 'Unggah Excel kurikulum' },
    ];

    return (
      <div className="admin-overview-grid animate-fadeIn">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: 'groups', label: 'Total Murid', value: adminStats.count, tone: 'bg-secondary-container text-on-secondary-container' },
            { icon: 'class', label: 'Total Kelas', value: adminStats.classCount || 0, tone: 'bg-primary-fixed text-primary' },
            { icon: 'category', label: 'Program Peminatan', value: adminStats.peminatanCount || 0, tone: 'bg-secondary-fixed text-secondary' },
            { icon: 'wc', label: 'L / P', value: `${adminStats.boys} / ${adminStats.girls}`, tone: 'bg-surface-container text-on-surface' },
          ].map((stat) => (
            <div key={stat.label} className="admin-stat-card">
              <div className={`admin-stat-icon ${stat.tone}`}>
                <span className="material-symbols-outlined text-[22px]">{stat.icon}</span>
              </div>
              <p className="text-label-md text-on-surface-variant uppercase">{stat.label}</p>
              <p className="text-headline-md text-primary mt-1">{typeof stat.value === 'number' ? stat.value.toLocaleString('id-ID') : stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <button key={link.tab} type="button" onClick={() => switchAdminTab(link.tab)} className="admin-quick-link">
              <div className="admin-quick-link-icon">
                <span className="material-symbols-outlined text-[24px]">{link.icon}</span>
              </div>
              <div>
                <h3 className="text-title-lg text-primary">{link.label}</h3>
                <p className="text-body-md text-on-surface-variant mt-1">{link.desc}</p>
              </div>
            </button>
          ))}
        </div>

      <div className="bento-card no-hover rounded-2xl">
          <div className="admin-section-head">
            <div className="admin-section-head-left">
              <div className="admin-section-icon">
                <span className="material-symbols-outlined text-[22px]">schedule</span>
              </div>
              <h3 className="text-title-lg text-primary">Atur Jadwal Rilis Pengumuman</h3>
            </div>
            <span className={`badge-status ${isOpened ? 'badge-status--live' : 'badge-status--draft'}`}>
              <span className={`material-symbols-outlined text-[14px] ${isOpened ? 'filled' : ''}`}>{isOpened ? 'check_circle' : 'edit_note'}</span>
              {isOpened ? 'Dipublikasikan' : 'Draft'}
            </span>
          </div>

          <form onSubmit={handleUpdateReleaseDate} className="admin-schedule-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-label-md text-on-surface-variant" htmlFor="release-date">Tanggal Rilis</label>
                <input
                  type="date"
                  id="release-date"
                  value={releaseDate}
                  onChange={(e) => setAdminDateInput(`${e.target.value}T${releaseTime || '00:00'}`)}
                  required
                  className="input-taktil input-taktil--sm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label-md text-on-surface-variant" htmlFor="release-time">Waktu Rilis (WIB)</label>
                <input
                  type="time"
                  id="release-time"
                  value={releaseTime}
                  onChange={(e) => setAdminDateInput(`${releaseDate || new Date().toISOString().split('T')[0]}T${e.target.value}`)}
                  required
                  className="input-taktil input-taktil--sm"
                />
              </div>
            </div>

            <p className="flex items-start gap-3 text-body-md text-on-surface-variant bg-surface-container-low rounded-xl p-4">
              <span className="material-symbols-outlined text-secondary shrink-0 mt-0.5">info</span>
              <span>Pengumuman murid akan dipublikasikan otomatis pada tanggal dan waktu yang dipilih.</span>
            </p>

            <div className="admin-schedule-actions">
              <button type="submit" className="btn-action btn-action--primary">
                <span className="material-symbols-outlined text-[18px]">save</span>
                Simpan Jadwal
              </button>
              <button type="button" onClick={() => handleBypassRelease(true)} disabled={isOpened} className="btn-action btn-action--success">
                <span className="material-symbols-outlined text-[18px]">lock_open</span>
                Buka Gerbang
              </button>
              <button type="button" onClick={() => handleBypassRelease(false)} disabled={!isOpened} className="btn-action btn-action--warning">
                <span className="material-symbols-outlined text-[18px]">lock</span>
                Kunci Gerbang
              </button>
            </div>
          </form>
        </div>

        <div className="admin-overview-grid admin-overview-grid--bottom">
          <div className="bento-card no-hover rounded-2xl h-full">
            <h3 className="text-title-lg text-primary mb-4">Ringkasan Sistem</h3>
            <div className="space-y-2.5">
              <div className="admin-summary-row">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">lock_open</span>
                  <span className="text-body-md font-medium">Status Gerbang Portal</span>
                </div>
                <span className={`badge-status shrink-0 ${isOpened ? 'badge-status--live' : 'badge-status--draft'}`}>
                  {isOpened ? 'Dibuka' : 'Dikunci'}
                </span>
              </div>
              <div className="admin-summary-row">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">school</span>
                  <span className="text-body-md font-medium">Kelas Terdaftar</span>
                </div>
                <span className="text-body-md font-bold text-secondary shrink-0">{adminStats.classCount || 0} kelas</span>
              </div>
              <div className="admin-summary-row">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">category</span>
                  <span className="text-body-md font-medium">Program Peminatan</span>
                </div>
                <span className="text-body-md font-bold text-secondary shrink-0">{adminStats.peminatanCount || 0} program</span>
              </div>
            </div>
          </div>

          <div className="admin-trust-card">
            <div className="admin-trust-card-inner">
              <div className="admin-trust-card-icon">
                <span className="material-symbols-outlined">verified_user</span>
              </div>
              <div>
                <h3 className="admin-trust-card-title">Data Terlindungi</h3>
                <p className="admin-trust-card-desc">
                  Akses admin terbatas untuk menjaga privasi data murid.
                </p>
                <div className="admin-trust-card-tags">
                  <span className="admin-trust-card-tag">
                    <span className="material-symbols-outlined text-[12px]">lock</span>
                    Terenkripsi
                  </span>
                  <span className="admin-trust-card-tag">
                    <span className="material-symbols-outlined text-[12px]">shield</span>
                    Privasi Murid
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderAdminStudents() {
    return (
      <div className="space-y-5 animate-fadeIn">
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button type="button" onClick={openAddModal} className="btn-action btn-action--primary self-start sm:self-auto shrink-0">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Tambah Murid
          </button>
        </div>

        <div className="admin-toolbar">
          <div className="input-field input-field--sm">
            <span className="input-field-icon material-symbols-outlined" aria-hidden="true">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cari nama, NISN, atau NIPD..."
              className="input-taktil input-taktil--sm input-taktil--icon"
            />
          </div>
          <select
            value={filterClass}
            onChange={handleFilterClassChange}
            className="input-taktil input-taktil--sm cursor-pointer"
          >
            <option value="">Semua Kelas</option>
            {availableClasses.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="admin-panel">
          <div className="overflow-x-auto">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Urut</th>
                  <th>NISN</th>
                  <th>NIS</th>
                  <th>Nama Murid</th>
                  <th className="text-center">JK</th>
                  <th>Program Peminatan</th>
                  <th>Kelas</th>
                  <th className="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-on-surface-variant animate-pulse">
                      Memuat data murid...
                    </td>
                  </tr>
                ) : studentsList.length > 0 ? (
                  studentsList.map((student) => (
                    <tr key={student.id}>
                      <td className="font-semibold text-on-surface-variant">{student.urut || '-'}</td>
                      <td>{student.nisn}</td>
                      <td>{student.nipd}</td>
                      <td className="font-semibold text-primary">{student.nama}</td>
                      <td className="text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-label-md font-bold ${student.jk === 'L' ? 'bg-secondary-fixed text-secondary' : 'bg-tertiary-fixed text-tertiary'}`}>
                          {student.jk}
                        </span>
                      </td>
                      <td className="text-on-surface-variant">{student.peminatan}</td>
                      <td className="font-semibold text-secondary">{student.kelas}</td>
                      <td>
                        <div className="flex justify-center gap-2">
                          <button type="button" onClick={() => openEditModal(student)} className="btn-ghost" aria-label="Edit">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button type="button" onClick={() => handleDeleteStudent(student.id, student.nama)} className="btn-ghost danger" aria-label="Hapus">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-on-surface-variant">
                      Tidak ada data murid yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-panel-footer">
              <span className="text-label-md text-on-surface-variant font-semibold">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="btn-ghost disabled:opacity-40">
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  Sebelumnya
                </button>
                <button type="button" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="btn-ghost disabled:opacity-40">
                  Berikutnya
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderAdminClasses() {
    return (
      <div className="space-y-5 animate-fadeIn">
        <div className="admin-panel">
          <div className="overflow-x-auto">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Kelas</th>
                  <th>Guru Wali Kelas</th>
                  <th>Program Peminatan</th>
                  <th className="text-center">Jumlah</th>
                  <th className="text-center">L / P</th>
                  <th className="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-on-surface-variant animate-pulse">
                      Memuat data kelas...
                    </td>
                  </tr>
                ) : classesList.length > 0 ? (
                  classesList.map((item) => (
                    <tr key={item.kelas}>
                      <td className="font-bold text-primary">{item.kelas}</td>
                      <td>{item.namawalas}</td>
                      <td className="text-on-surface-variant">{item.peminatan}</td>
                      <td className="text-center font-semibold">{item.count}</td>
                      <td className="text-center text-on-surface-variant">{item.boys} / {item.girls}</td>
                      <td className="text-center">
                        <button type="button" onClick={() => goToStudentsByClass(item.kelas)} className="btn-ghost">
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          Lihat Murid
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-on-surface-variant">
                      Belum ada data kelas. Impor data murid terlebih dahulu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderAdminPeminatan() {
    return (
      <div className="space-y-5 animate-fadeIn">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loading ? (
            <div className="lg:col-span-2 admin-panel py-12 text-center text-on-surface-variant animate-pulse">Memuat data program peminatan...</div>
          ) : peminatanList.length > 0 ? (
            peminatanList.map((item) => (
              <div key={item.peminatan} className="admin-stat-card flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="admin-quick-link-icon shrink-0">
                      <span className="material-symbols-outlined text-[22px]">category</span>
                    </div>
                    <div>
                      <h3 className="text-title-lg text-primary">{item.peminatan}</h3>
                      <p className="text-body-md text-on-surface-variant mt-1">
                        {item.count} murid · {item.classCount} kelas · {item.boys}L / {item.girls}P
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.classes.map((kelas) => (
                    <button
                      key={kelas}
                      type="button"
                      onClick={() => goToStudentsByClass(kelas)}
                      className="btn-ghost !text-label-md !py-1.5"
                    >
                      {kelas}
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="lg:col-span-2 admin-panel py-12 text-center text-on-surface-variant">
              Belum ada data program peminatan. Impor data murid terlebih dahulu.
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderAdminImport() {
    const importColumns = [
      { key: 'URUT', required: false, format: 'Angka', desc: 'Nomor urut absensi murid' },
      { key: 'NIPD', required: true, format: 'Teks', desc: 'Nomor Induk Peserta Didik sekolah' },
      { key: 'NISN', required: true, format: '10 digit (teks)', desc: 'NISN nasional, harus unik di seluruh data' },
      { key: 'Nama', required: true, format: 'Teks', desc: 'Nama lengkap murid' },
      { key: 'JK', required: true, format: 'L / P', desc: 'Jenis kelamin: L = Laki-laki, P = Perempuan' },
      { key: 'namawalas', required: true, format: 'Teks', desc: 'Nama guru wali kelas' },
      { key: 'peminatan', required: true, format: 'Teks', desc: 'Program peminatan murid' },
      { key: 'KELAS', required: true, format: 'Teks', desc: 'Nama kelas baru, contoh: KELAS XI-1' },
    ];

    return (
      <div className="admin-import-page space-y-5 animate-fadeIn">
        <div className="admin-panel">
          <div className="admin-import-panel-head">
            <div className="admin-section-head !mb-0">
              <div className="admin-section-head-left">
                <div className="admin-section-icon">
                  <span className="material-symbols-outlined text-[22px]">table_chart</span>
                </div>
                <div>
                  <h3 className="text-title-lg text-primary">Format Kolom Excel</h3>
                  <p className="text-body-md text-on-surface-variant mt-0.5">
                    Gunakan header kolom persis seperti tabel di bawah. Sheet pertama wajib bernama <strong>Data Murid</strong>.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadImportTemplate}
              disabled={templateDownloading}
              className="btn-ghost admin-import-template-btn"
            >
              <span className="material-symbols-outlined text-[18px]">
                {templateDownloading ? 'hourglass_top' : 'download'}
              </span>
              {templateDownloading ? 'Menyiapkan...' : 'Unduh Template Excel'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="admin-data-table admin-import-columns-table">
              <thead>
                <tr>
                  <th>Kolom</th>
                  <th>Status</th>
                  <th>Format</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {importColumns.map((column) => (
                  <tr key={column.key}>
                    <td>
                      <code className="admin-import-col-code">{column.key}</code>
                    </td>
                    <td>
                      <span className={`admin-import-badge ${column.required ? 'admin-import-badge--required' : 'admin-import-badge--optional'}`}>
                        {column.required ? 'Wajib' : 'Opsional'}
                      </span>
                    </td>
                    <td className="text-on-surface-variant">{column.format}</td>
                    <td className="text-on-surface-variant">{column.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-import-tips">
            <p className="admin-import-tips-title">
              <span className="material-symbols-outlined text-[18px]">info</span>
              Tips pengisian
            </p>
            <ul>
              <li>Format kolom <strong>NISN</strong> dan <strong>NIPD</strong> sebagai teks agar angka nol di depan tidak hilang.</li>
              <li>Template sudah berisi 1 baris contoh — hapus atau ganti setelah memahami formatnya.</li>
              <li>Impor ulang dengan NISN sama akan memperbarui data murid yang sudah ada.</li>
            </ul>
          </div>
        </div>

        <div className="admin-panel admin-import-upload-panel">
          <div className="admin-import-panel-head admin-import-panel-head--compact">
            <div>
              <h3 className="text-title-lg text-primary">Unggah File Excel</h3>
              <p className="text-body-md text-on-surface-variant mt-0.5">Pilih file .xlsx atau .xls yang sudah diisi sesuai template.</p>
            </div>
          </div>

          <form onSubmit={handleImportExcel} className="admin-import-upload-form">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) setExcelFile(e.dataTransfer.files[0]);
              }}
              className={`drag-area-dash admin-import-dropzone ${dragActive ? 'dragging' : ''} ${excelFile ? 'has-file' : ''}`}
            >
              <span className="material-symbols-outlined admin-import-dropzone-icon">
                {excelFile ? 'description' : 'upload_file'}
              </span>
              <h4 className="text-title-lg text-primary">
                {excelFile ? excelFile.name : 'Klik atau seret file Excel ke sini'}
              </h4>
              <p className="text-body-md text-on-surface-variant mt-1">
                {excelFile
                  ? `${(excelFile.size / 1024).toFixed(1)} KB — klik untuk ganti file`
                  : 'Format .xlsx / .xls'}
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                accept=".xlsx,.xls"
                className="hidden"
              />
            </div>

            {importStatus && (
              <div className="admin-import-status">
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                {importStatus}
              </div>
            )}

            <div className="admin-import-actions">
              <button
                type="button"
                onClick={handleDownloadImportTemplate}
                disabled={templateDownloading}
                className="btn-ghost"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Template
              </button>
              <button type="submit" disabled={loading || !excelFile} className="btn-secondary admin-import-submit-btn">
                <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                {loading ? 'Memproses...' : 'Mulai Impor Massal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderAdminSettings() {
    return (
      <div className="space-y-5 animate-fadeIn">
        <div className="grid grid-cols-1 gap-5">
          <div className="bento-card no-hover rounded-2xl flex flex-col gap-5 text-left">
            <h3 className="text-title-lg text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">badge</span>
              Identitas Portal Sekolah
            </h3>
            <p className="text-body-md text-on-surface-variant">
              Logo dan nama sekolah tampil di portal murid dan panel admin. Nama tim IT dipakai sebagai
              kontak bantuan di halaman login murid, bukan di footer.
            </p>

            <form onSubmit={handleSaveBranding} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="admin-form-label" htmlFor="schoolName">Nama Sekolah</label>
                  <input
                    id="schoolName"
                    type="text"
                    value={brandingForm.schoolName}
                    onChange={(e) => handleBrandingFieldChange('schoolName', e.target.value)}
                    required
                    className="input-taktil input-taktil--sm"
                    placeholder="Contoh: SMAN 1 Sooko"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="admin-form-label" htmlFor="schoolTagline">Tagline / Subtitle</label>
                  <input
                    id="schoolTagline"
                    type="text"
                    value={brandingForm.schoolTagline}
                    onChange={(e) => handleBrandingFieldChange('schoolTagline', e.target.value)}
                    className="input-taktil input-taktil--sm"
                    placeholder="Contoh: Portal Informasi Sekolah"
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="admin-form-label" htmlFor="footerCopy">Teks Footer</label>
                  <input
                    id="footerCopy"
                    type="text"
                    value={brandingForm.footerCopy}
                    onChange={(e) => handleBrandingFieldChange('footerCopy', e.target.value)}
                    className="input-taktil input-taktil--sm"
                    placeholder="Contoh: © 2026 SMAN 1 Sooko Mojokerto. All Rights Reserved."
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="admin-form-label" htmlFor="itTeamLabel">Nama Tim IT / Bantuan Teknis <span className="text-on-surface-variant font-normal normal-case">(opsional)</span></label>
                  <input
                    id="itTeamLabel"
                    type="text"
                    value={brandingForm.itTeamLabel}
                    onChange={(e) => handleBrandingFieldChange('itTeamLabel', e.target.value)}
                    className="input-taktil input-taktil--sm"
                    placeholder="Kosongkan untuk default: Tim IT [Nama Sekolah]"
                  />
                  <p className="text-body-md text-on-surface-variant m-0">
                    Tampil di bantuan portal murid: <strong>{resolveItSupportLabel({ ...brandingForm, schoolName: brandingForm.schoolName || branding.schoolName })}</strong>
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                <div className="w-16 h-16 bg-white rounded-xl p-2 border border-outline-variant shrink-0">
                  <img src={logoSrc} alt="Pratinjau logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col gap-2 flex-grow">
                  <span className="text-label-md text-on-surface-variant uppercase">Logo Sekolah</span>
                  <p className="text-body-md text-on-surface-variant m-0">PNG, JPG, WEBP, atau SVG. Maks. 2 MB.</p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleLogoFileChange(e.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="btn-secondary"
                    >
                      <span className="material-symbols-outlined text-[18px]">upload</span>
                      Pilih Logo
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadLogo}
                      disabled={loading || !logoFile}
                      className="btn-action btn-action--success disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      Unggah Logo
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-secondary self-start disabled:opacity-50">
                <span className="material-symbols-outlined text-[18px]">save</span>
                Simpan Identitas Portal
              </button>
            </form>
          </div>

          <div className="bento-card no-hover rounded-2xl flex flex-col gap-5 text-left">
            <h3 className="text-title-lg text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">tune</span>
              Fitur Portal Murid
            </h3>
            <p className="text-body-md text-on-surface-variant">
              Atur fitur yang tampil di dashboard murid setelah login.
            </p>

            <form onSubmit={handleSavePortalSettings} className="flex flex-col gap-4">
              <label className="admin-setting-toggle">
                <input
                  type="checkbox"
                  checked={portalSettings.classmatesVisible}
                  onChange={(e) => setPortalSettings({ classmatesVisible: e.target.checked })}
                  className="admin-setting-toggle-input"
                />
                <span className="admin-setting-toggle-track" aria-hidden="true">
                  <span className="admin-setting-toggle-thumb" />
                </span>
                <span className="admin-setting-toggle-copy">
                  <strong>Tampilkan Teman Sekelas</strong>
                  <span>
                    Murid dapat membuka daftar nama teman satu kelas di bawah informasi pembagian kelas.
                    Nonaktifkan jika sekolah ingin menyembunyikan daftar murid.
                  </span>
                </span>
              </label>

              <button type="submit" disabled={loading} className="btn-secondary self-start disabled:opacity-50">
                <span className="material-symbols-outlined text-[18px]">save</span>
                Simpan Pengaturan Fitur
              </button>
            </form>
          </div>

          <div className="bento-card no-hover rounded-2xl border border-error/30 bg-error-container/30 flex flex-col gap-4 text-left">
            <h3 className="text-title-lg text-error flex items-center gap-2">
              <span className="material-symbols-outlined">warning</span>
              Pengosongan Total Basis Data
            </h3>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Tindakan ini akan membersihkan seluruh tabel data murid. Data yang dihapus tidak dapat dipulihkan.
            </p>

            <button type="button" onClick={handleResetDatabase} className="admin-btn-logout self-start !bg-error/90 !border-error hover:!bg-error">
              <span className="material-symbols-outlined text-[18px]">delete_forever</span>
              Kosongkan Database
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ROOT COMPONENT RETURN
  // ==========================================

  return (
    <div className="min-h-screen min-h-dvh w-full relative z-10 bg-background text-on-surface flex flex-col">
      {view === 'loading' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center gap-4">
          <div className="w-12 h-12 p-2 bg-surface-container rounded-2xl flex items-center justify-center mb-2 float-animation">
            <img src={logoSrc} alt="Loading" className="w-full h-full object-contain" />
          </div>
          <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
          <span className="text-body-md text-on-surface-variant">Memuat panel admin {branding.schoolName}...</span>
        </div>
      )}

      {view === 'login' && renderAdminLoginView()}
      {view === 'dashboard' && renderAdminDashboardView()}

      {showAddModal && renderStudentModal('add', 'Tambah Murid Baru', 'person_add', handleAddStudent, () => setShowAddModal(false))}

      {showEditModal && renderStudentModal('edit', 'Edit Data Murid', 'edit_note', handleEditStudent, () => setShowEditModal(false))}

      {showChangePasswordModal && renderChangePasswordModal()}

    </div>
  );
}
