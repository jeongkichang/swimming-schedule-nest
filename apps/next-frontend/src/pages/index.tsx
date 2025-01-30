import React from 'react';
import Link from 'next/link';

export default function HomePage() {
    return (
        <div>
            <h1>Welcome to Swimming Info</h1>
            <p>
                <Link href="/available-swim">오늘 가능한 자유수영 확인하기</Link>
            </p>
        </div>
    );
}
