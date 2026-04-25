// ---------------------------------------------------------------------------
// OrgSettings Page
// Lets authenticated users upload a logo and set a custom primary colour.
// Changes are persisted to Firebase Storage + Firestore immediately.
// ---------------------------------------------------------------------------

import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getBranding, uploadLogo, removeLogo, savePrimaryColor } from '../services/branding';
import type { BrandingSettings } from '../services/branding';
import Button from '../components/ui/Button';
import './OrgSettings.css';

const PRESET_COLORS = [
  '#6C3FC5', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4',
];

const OrgSettings: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [localColor, setLocalColor] = useState('');

  const { data: branding = {} as BrandingSettings, isLoading } = useQuery<BrandingSettings>({
    queryKey: ['branding', user?.uid],
    queryFn: () => getBranding(user!.uid),
    enabled: !!user,
  });

  useEffect(() => {
    if (branding?.primaryColor) setLocalColor(branding.primaryColor);
  }, [branding?.primaryColor]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { setMessage('Logo must be under 2 MB.'); return; }
    setUploading(true);
    setMessage('');
    const url = await uploadLogo(user.uid, file);
    setUploading(false);
    if (url) {
      queryClient.invalidateQueries({ queryKey: ['branding', user.uid] });
      setMessage('Logo uploaded successfully!');
    } else {
      setMessage('Upload failed. Please try again.');
    }
  }

  async function handleRemoveLogo() {
    if (!user || !window.confirm('Remove your logo?')) return;
    setUploading(true);
    await removeLogo(user.uid);
    queryClient.invalidateQueries({ queryKey: ['branding', user.uid] });
    setUploading(false);
    setMessage('Logo removed.');
  }

  async function handleSaveColor() {
    if (!user || !localColor) return;
    setSaving(true);
    setMessage('');
    await savePrimaryColor(user.uid, localColor);
    queryClient.invalidateQueries({ queryKey: ['branding', user.uid] });
    setSaving(false);
    setMessage('Brand colour saved!');
  }

  if (isLoading) {
    return (
      <div className="os-page">
        <div className="os-loading"><div className="loading-spinner" /></div>
      </div>
    );
  }

  const activeColor = localColor || branding.primaryColor || '#6C3FC5';

  return (
    <div className="os-page">
      <div className="container os-container">
        <div className="os-header">
          <div>
            <h1 className="os-title">Brand Settings</h1>
            <p className="os-subtitle">Customise the logo and colour shown to your players in lobbies, game screens, and results.</p>
          </div>
          <Link to="/dashboard"><Button variant="ghost" size="md">Back to Dashboard</Button></Link>
        </div>

        {message && (
          <div className={`os-message ${message.includes('failed') || message.includes('must') ? 'os-message-error' : 'os-message-success'}`}>
            {message}
          </div>
        )}

        {/* ---- Logo ---- */}
        <section className="os-section">
          <h2 className="os-section-title">Organisation Logo</h2>
          <p className="os-section-desc">PNG, JPG, SVG or GIF — max 2 MB. Displayed at 48px height.</p>
          <div className="os-logo-row">
            {branding.logoUrl ? (
              <div className="os-logo-preview">
                <img src={branding.logoUrl} alt="Your logo" className="os-logo-img" />
                <Button variant="danger" size="sm" onClick={handleRemoveLogo} isLoading={uploading}>
                  Remove Logo
                </Button>
              </div>
            ) : (
              <div className="os-logo-placeholder">No logo set</div>
            )}
            <div className="os-logo-actions">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
              <Button variant="secondary" size="md" onClick={() => fileRef.current?.click()} isLoading={uploading}>
                {branding.logoUrl ? 'Replace Logo' : 'Upload Logo'}
              </Button>
            </div>
          </div>
        </section>

        {/* ---- Primary Colour ---- */}
        <section className="os-section">
          <h2 className="os-section-title">Brand Colour</h2>
          <p className="os-section-desc">Used as the accent colour in your game lobby and results screens.</p>
          <div className="os-color-presets">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className={`os-preset-swatch ${localColor === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setLocalColor(c)}
                aria-label={c}
                aria-pressed={localColor === c}
              />
            ))}
          </div>
          <div className="os-color-custom-row">
            <label className="os-custom-label">Custom colour:</label>
            <input
              type="color"
              className="os-color-picker"
              value={activeColor}
              onChange={(e) => setLocalColor(e.target.value)}
            />
            <span className="os-color-hex">{activeColor}</span>
          </div>
          <div className="os-color-preview-bar" style={{ background: activeColor }} aria-hidden="true" />
          <Button variant="primary" size="md" onClick={handleSaveColor} isLoading={saving} style={{ marginTop: '1rem' }}>
            Save Brand Colour
          </Button>
        </section>
      </div>
    </div>
  );
};

export default OrgSettings;
