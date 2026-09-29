'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin,
  Search,
  Filter,
  Layers,
  CheckCircle2,
  Clock,
  PieChart,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Edit2,
  Users,
  Home,
  Check,
  X,
  Navigation,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { useCampaignRealtime } from '@/hooks/useCampaignRealtime';

interface Agent {
  id: string;
  name: string;
  phone?: string;
}

interface BoothProperties {
  id: string;
  campaignId: string;
  wardId: string;
  wardNumber: number;
  wardName: string;
  boothNumber: number;
  name: string;
  areaLocality: string | null;
  pollingStation: string | null;
  totalElectors: number;
  votersCount: number;
  householdsCount: number;
  verifiedHouseholdsCount: number;
  coveragePct: number;
  coverageStatus: 'Completed' | 'Good' | 'Partial' | 'Not Visited';
  issuesCount: number;
  assignedAgents: Agent[];
  hasLocation: boolean;
  statusNote?: string;
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: BoothProperties;
}

interface MapDataSummary {
  totalBooths: number;
  mappedBoothsCount: number;
  unmappedBoothsCount: number;
  totalHouseholds: number;
  verifiedHouseholds: number;
  coveragePct: number;
  totalIssues: number;
}

interface MapApiResponse {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  summary: MapDataSummary;
  unmappedBooths: BoothProperties[];
}

export function CampaignMapClient({
  campaignId,
  userRole = 'CAMPAIGN_ADMIN',
}: {
  campaignId: string;
  userRole?: string;
}) {
  const [data, setData] = useState<MapApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooth, setSelectedBooth] = useState<BoothProperties | null>(null);

  // Modal state for editing coordinates
  const [editingBooth, setEditingBooth] = useState<BoothProperties | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Zoom / pan level in interactive canvas
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const fetchMapData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/campaigns/${campaignId}/map`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`Failed to load map data: HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error?.message || 'Error loading map');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching map data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, [campaignId]);

  // Recovery Step 7 Realtime SSE hook: refetch map on field visit, assignment, or issue
  const { connectionState } = useCampaignRealtime({
    campaignId,
    enabled: true,
    onEvent: (evt) => {
      if (
        evt.type.includes('FIELD_VISIT') ||
        evt.type.includes('HOUSEHOLD') ||
        evt.type.includes('ASSIGNMENT') ||
        evt.type.includes('ISSUE') ||
        evt.type.includes('BOOTH')
      ) {
        fetchMapData();
      }
    },
  });

  // Extract unique wards for filter
  const wards = useMemo(() => {
    if (!data) return [];
    const set = new Map<string, { id: string; name: string; number: number }>();
    data.features.forEach((f) => {
      set.set(f.properties.wardId, {
        id: f.properties.wardId,
        name: f.properties.wardName,
        number: f.properties.wardNumber,
      });
    });
    data.unmappedBooths.forEach((b) => {
      set.set(b.wardId, {
        id: b.wardId,
        name: b.wardName,
        number: b.wardNumber,
      });
    });
    return Array.from(set.values()).sort((a, b) => a.number - b.number);
  }, [data]);

  // Filter features & unmapped booths
  const filteredFeatures = useMemo(() => {
    if (!data) return [];
    return data.features.filter((f) => {
      const matchesWard = selectedWard === 'ALL' || f.properties.wardId === selectedWard;
      const matchesSearch =
        searchQuery === '' ||
        f.properties.boothNumber.toString().includes(searchQuery) ||
        f.properties.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.properties.areaLocality &&
          f.properties.areaLocality.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesWard && matchesSearch;
    });
  }, [data, selectedWard, searchQuery]);

  const filteredUnmapped = useMemo(() => {
    if (!data) return [];
    return data.unmappedBooths.filter((b) => {
      const matchesWard = selectedWard === 'ALL' || b.wardId === selectedWard;
      const matchesSearch =
        searchQuery === '' ||
        b.boothNumber.toString().includes(searchQuery) ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.areaLocality && b.areaLocality.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesWard && matchesSearch;
    });
  }, [data, selectedWard, searchQuery]);

  // Calculate bounding box for projected coordinate system
  const bounds = useMemo(() => {
    if (filteredFeatures.length === 0) {
      return null;
    }
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    filteredFeatures.forEach((f) => {
      const [lng, lat] = f.geometry.coordinates;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    // Add padding if point or very close
    if (minLat === maxLat) {
      minLat -= 0.005;
      maxLat += 0.005;
    }
    if (minLng === maxLng) {
      minLng -= 0.005;
      maxLng += 0.005;
    }

    return { minLat, maxLat, minLng, maxLng };
  }, [filteredFeatures]);

  const handleOpenEdit = (booth: BoothProperties, feature?: GeoJSONFeature) => {
    setEditingBooth(booth);
    setEditError(null);
    if (feature) {
      setLngInput(feature.geometry.coordinates[0].toString());
      setLatInput(feature.geometry.coordinates[1].toString());
    } else {
      setLatInput('');
      setLngInput('');
    }
  };

  const handleSaveLocation = async () => {
    if (!editingBooth) return;
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setEditError('Latitude must be a valid number between -90 and 90');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setEditError('Longitude must be a valid number between -180 and 180');
      return;
    }

    try {
      setSavingLocation(true);
      setEditError(null);
      const res = await fetch(`/api/v1/campaigns/${campaignId}/booths/${editingBooth.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update location');
      }
      setEditingBooth(null);
      await fetchMapData();
    } catch (err: any) {
      setEditError(err.message || 'Error updating location');
    } finally {
      setSavingLocation(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return { bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-500', fill: '#10B981' };
      case 'Good':
        return { bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-500', fill: '#3B82F6' };
      case 'Partial':
        return { bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-500', fill: '#F59E0B' };
      default:
        return { bg: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-500', fill: '#EF4444' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Booth Coverage Map</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                connectionState === 'CONNECTED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionState === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {connectionState === 'CONNECTED' ? 'Live Geospatial Sync' : 'Reconnecting...'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Database-backed operational geography mapped from PostgreSQL polling stations and field visit telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm"
          >
            <option value="ALL">All Wards ({wards.length})</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                Ward {w.number}: {w.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchMapData()}
            disabled={loading}
            className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-white shadow-sm transition hover:bg-slate-50"
            title="Refresh Map Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Cards Directly Sourced from DB */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Booths"
          value={data ? data.summary.totalBooths.toString() : '...'}
          subtitle={`${data ? data.summary.mappedBoothsCount : 0} mapped on grid`}
          icon={Layers}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
        />
        <StatCard
          title="Mapped Coordinates"
          value={data ? `${data.summary.mappedBoothsCount} of ${data.summary.totalBooths}` : '...'}
          subtitle={
            data && data.summary.unmappedBoothsCount > 0
              ? `${data.summary.unmappedBoothsCount} booths pending location`
              : 'All booths mapped'
          }
          icon={MapPin}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
          badge={{
            text: data && data.summary.unmappedBoothsCount > 0 ? `${data.summary.unmappedBoothsCount} Unset` : '100% Set',
            type: data && data.summary.unmappedBoothsCount > 0 ? 'warning' : 'success',
          }}
        />
        <StatCard
          title="Household Coverage"
          value={data ? `${data.summary.coveragePct}%` : '...'}
          subtitle={`${data ? data.summary.verifiedHouseholds.toLocaleString() : 0} of ${
            data ? data.summary.totalHouseholds.toLocaleString() : 0
          } verified`}
          icon={PieChart}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-50"
          badge={{
            text: data ? `${data.summary.coveragePct}%` : '0%',
            type: 'info',
          }}
        />
        <StatCard
          title="Open Field Issues"
          value={data ? data.summary.totalIssues.toString() : '...'}
          subtitle="Pending voter complaints"
          icon={AlertTriangle}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-50"
        />
      </div>

      {/* Unmapped Booths Alert Banner */}
      {data && data.summary.unmappedBoothsCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                {data.summary.unmappedBoothsCount} Booths Require GPS Coordinate Setup
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Electoral PDF rolls do not include geographic coordinates. Set booth coordinates below to render them on the map.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Interactive Map (Left) & Booth List / Details (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Interactive Geospatial Map (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                {selectedWard === 'ALL'
                  ? 'All Campaign Booth Sectors'
                  : `Ward ${wards.find((w) => w.id === selectedWard)?.number} - Booth Sectors`}
              </h3>
            </div>

            {/* Coverage Legend */}
            <div className="flex items-center gap-3 text-[11px] font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-600">Not Visited (0%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-600">Partial (&lt;50%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600">Good (≥50%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Completed (100%)</span>
              </div>
            </div>
          </div>

          {/* Map Canvas */}
          <div
            className="flex-1 min-h-[480px] bg-slate-900 rounded-xl relative border border-slate-800 overflow-hidden flex items-center justify-center p-4 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={(e) => {
              setIsDragging(true);
              dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
            }}
            onMouseMove={(e) => {
              if (isDragging) {
                setPan({
                  x: e.clientX - dragStartRef.current.x,
                  y: e.clientY - dragStartRef.current.y,
                });
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            {/* Dark Mode Grid / Map Background */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #38bdf8 1px, transparent 1px), radial-gradient(circle, #38bdf8 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                backgroundPosition: '0 0, 20px 20px',
              }}
            />

            {/* Empty State: If No Mapped Coordinates */}
            {filteredFeatures.length === 0 ? (
              <div className="text-center p-8 max-w-md z-10">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 text-amber-400 mx-auto flex items-center justify-center mb-3">
                  <MapPin className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white mb-1">No Mapped Booth Coordinates</h4>
                <p className="text-xs text-slate-400 mb-4">
                  Booths are registered in PostgreSQL, but have not yet been assigned GPS coordinates. Click &ldquo;Set Location&rdquo; in the booth list on the right to place booths on the map.
                </p>
              </div>
            ) : (
              /* Projected SVG Canvas based on Real Coordinates */
              <svg
                viewBox="0 0 800 600"
                className="w-full h-full max-h-[520px] transition-transform duration-75"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                }}
              >
                {/* Visual coordinate connector rays between booths */}
                {filteredFeatures.map((f, i) => {
                  if (i === 0 || !bounds) return null;
                  const prev = filteredFeatures[i - 1];
                  const x1 = 100 + ((prev.geometry.coordinates[0] - bounds.minLng) / (bounds.maxLng - bounds.minLng || 0.001)) * 600;
                  const y1 = 500 - ((prev.geometry.coordinates[1] - bounds.minLat) / (bounds.maxLat - bounds.minLat || 0.001)) * 400;
                  const x2 = 100 + ((f.geometry.coordinates[0] - bounds.minLng) / (bounds.maxLng - bounds.minLng || 0.001)) * 600;
                  const y2 = 500 - ((f.geometry.coordinates[1] - bounds.minLat) / (bounds.maxLat - bounds.minLat || 0.001)) * 400;

                  return (
                    <line
                      key={`line-${i}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#334155"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Render Booth Sector Nodes */}
                {filteredFeatures.map((f) => {
                  if (!bounds) return null;
                  const [lng, lat] = f.geometry.coordinates;
                  const x = 100 + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 0.001)) * 600;
                  const y = 500 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 0.001)) * 400;

                  const colors = getStatusColor(f.properties.coverageStatus);
                  const isSelected = selectedBooth?.id === f.properties.id;

                  return (
                    <g
                      key={f.properties.id}
                      className="cursor-pointer transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBooth(f.properties);
                      }}
                    >
                      {/* Pulse halo for active/selected */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 32 : 24}
                        fill={colors.fill}
                        fillOpacity={isSelected ? 0.35 : 0.15}
                        className={isSelected ? 'animate-pulse' : ''}
                      />

                      {/* Boundary Node Circle */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 18 : 14}
                        fill="#0f172a"
                        stroke={colors.fill}
                        strokeWidth={isSelected ? 4 : 2.5}
                      />

                      {/* Booth Number Label */}
                      <text
                        x={x}
                        y={y + 4}
                        fill="#ffffff"
                        fontSize={isSelected ? '12' : '10'}
                        fontWeight="bold"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {f.properties.boothNumber}
                      </text>

                      {/* Floating Tooltip Label */}
                      <text
                        x={x}
                        y={y - 20}
                        fill="#94a3b8"
                        fontSize="9"
                        fontWeight="600"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {f.properties.name.length > 20
                          ? f.properties.name.substring(0, 18) + '...'
                          : f.properties.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Map Floating Controls */}
            <div className="absolute bottom-4 right-4 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg shadow-xl flex flex-col divide-y divide-slate-700 overflow-hidden z-20">
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/60"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/60"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="p-2 text-blue-400 hover:text-white hover:bg-slate-700/60"
                title="Reset View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Booth List & Selected Detail Panel (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 flex flex-col">
          
          {/* Selected Booth Inspector (if clicked) */}
          {selectedBooth ? (
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl relative">
              <button
                onClick={() => setSelectedBooth(null)}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                  Booth #{selectedBooth.boothNumber}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    getStatusColor(selectedBooth.coverageStatus).border
                  } ${getStatusColor(selectedBooth.coverageStatus).text} bg-white`}
                >
                  {selectedBooth.coverageStatus} ({selectedBooth.coveragePct}%)
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-900 leading-snug">{selectedBooth.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Ward {selectedBooth.wardNumber} ({selectedBooth.wardName}) •{' '}
                {selectedBooth.areaLocality || 'Locality unassigned'}
              </p>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                  <span>Coverage</span>
                  <span>
                    {selectedBooth.verifiedHouseholdsCount} / {selectedBooth.householdsCount} Homes
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full ${getStatusColor(selectedBooth.coverageStatus).bg}`}
                    style={{ width: `${selectedBooth.coveragePct}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 block">Voters</span>
                  <span className="text-xs font-black text-slate-800">{selectedBooth.votersCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Homes</span>
                  <span className="text-xs font-black text-slate-800">{selectedBooth.householdsCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Issues</span>
                  <span className="text-xs font-black text-amber-600">{selectedBooth.issuesCount}</span>
                </div>
              </div>

              {/* Assigned Agents */}
              <div className="mt-3 pt-3 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Assigned Agents ({selectedBooth.assignedAgents.length})
                </span>
                {selectedBooth.assignedAgents.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No field agent assigned</span>
                ) : (
                  <div className="space-y-1">
                    {selectedBooth.assignedAgents.map((ag) => (
                      <div key={ag.id} className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-blue-500" />
                        {ag.name} {ag.phone ? `(${ag.phone})` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action */}
              {userRole !== 'POLITICAL_AGENT' && (
                <div className="mt-4 pt-2">
                  <button
                    onClick={() => {
                      const feat = filteredFeatures.find((f) => f.properties.id === selectedBooth.id);
                      handleOpenEdit(selectedBooth, feat);
                    }}
                    className="w-full py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Coordinates
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* Search & Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Booths ({filteredFeatures.length + filteredUnmapped.length})
            </h3>
          </div>

          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search booth number or area..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[460px]">
            {filteredFeatures.length === 0 && filteredUnmapped.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No booths match the selected criteria.
              </div>
            ) : (
              <>
                {/* Mapped Booths */}
                {filteredFeatures.map((f) => {
                  const b = f.properties;
                  const isSelected = selectedBooth?.id === b.id;
                  const colors = getStatusColor(b.coverageStatus);

                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBooth(b)}
                      className={`p-3 border rounded-xl transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">Booth {b.boothNumber}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${colors.bg}`}
                            title={`Status: ${b.coverageStatus}`}
                          />
                          <span className="text-[10px] text-slate-500 truncate">
                            W-{b.wardNumber}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-600 block mt-0.5 truncate">{b.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {b.areaLocality || 'Locality not set'}
                        </span>
                      </div>

                      <div className="text-right flex flex-col items-end shrink-0">
                        <span className="text-xs font-black text-slate-900">
                          {b.coveragePct}% Cov.
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {b.verifiedHouseholdsCount}/{b.householdsCount} Homes
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Unmapped Booths */}
                {filteredUnmapped.map((b) => {
                  const isSelected = selectedBooth?.id === b.id;

                  return (
                    <div
                      key={b.id}
                      className={`p-3 border rounded-xl transition flex items-center justify-between border-dashed ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/40'
                          : 'border-amber-300 bg-amber-50/20 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">Booth {b.boothNumber}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            UNMAPPED
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-600 block mt-0.5 truncate">{b.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          W-{b.wardNumber} • {b.areaLocality || 'Locality not set'}
                        </span>
                      </div>

                      {userRole !== 'POLITICAL_AGENT' && (
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-sm shrink-0"
                        >
                          <MapPin className="w-3 h-3" /> Set GPS
                        </button>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Coordinate Edit Modal */}
      {editingBooth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Configure GPS Coordinates
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Booth {editingBooth.boothNumber}: {editingBooth.name}
                </p>
              </div>
              <button
                onClick={() => setEditingBooth(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs mb-4">
                {editError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Latitude (-90 to 90)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="e.g. 12.9716"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Longitude (-180 to 180)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  placeholder="e.g. 77.5946"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700 block mb-0.5">Geospatial Note:</span>
                Coordinates persist directly to the PostgreSQL `Booth` record and update real-time maps for all campaign field agents.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingBooth(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingLocation}
                onClick={handleSaveLocation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {savingLocation ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Save Coordinates
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
