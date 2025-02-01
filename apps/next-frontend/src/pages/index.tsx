import React, { useEffect, useState } from 'react';

export default function NearbySwimPage() {
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setLat(latitude);
                    setLng(longitude);
                },
                (error) => {
                    console.error('Error getting location:', error);
                }
            );
        }
    }, []);

    const handleFetchSchedules = async () => {
        if (lat === null || lng === null) return;
        setLoading(true);

        try {
            const res = await fetch('http://localhost:3000/available-swim-near', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, lng }),
            });
            const data = await res.json();
            setSchedules(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1>Near By Swim Schedules</h1>
            <p>현재 위치: lat={lat}, lng={lng}</p>
            <button onClick={handleFetchSchedules} disabled={loading || lat === null}>
                {loading ? 'Loading...' : 'Find Schedules within 2km'}
            </button>

            {schedules.length > 0 && (
                <ul>
                    {schedules.map((sch, idx) => (
                        <li key={idx}>
                            {sch.title} ({sch.address}) / {sch.day} {sch.time_range}
                            - 성인: {sch.adult_fee}, 청소년: {sch.teen_fee}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
