import React from 'react';

export async function getServerSideProps() {
    const res = await fetch('http://localhost:3000/available-swim');
    const data = await res.json();

    return {
        props: {
            schedules: data || []
        }
    }
}

export default function AvailableSwimPage({ schedules }: { schedules: any[] }) {
    return (
        <div>
            <h1>Today's Available Swim Schedules</h1>
            {schedules && schedules.length > 0 ? (
                <ul>
                    {schedules.map((sch, idx) => (
                        <li key={idx}>
                            {sch.title} ({sch.address}) {sch.day} {sch.time_range} - 성인: {sch.adult_fee}, 청소년: {sch.teen_fee}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No available swim schedules found for today.</p>
            )}
        </div>
    )
}
