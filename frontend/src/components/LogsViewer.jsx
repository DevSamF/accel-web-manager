import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import classes from './LogsViewer.module.css';

const withCurrentTimestamp = (line) => {
    const now = new Date();
    const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    return line.replace(/^\[[^\]]+\]/, `[${time}]`);
};

const LogsViewer = () => {
    const [lines, setLines] = useState([]);
    const [status, setStatus] = useState('Connecting…');
    const cursor = useRef(null);
    const output = useRef(null);

    useEffect(() => {
        let mounted = true;
        let timer;

        const startPolling = () => {
            poll();
            timer = window.setInterval(poll, 1500);
        };

        const poll = async () => {
            try {
                const params = cursor.current === null ? {} : { cursor: cursor.current };
                const response = await axios.get('logs', { params });
                if (!mounted) return;
                const data = response.data;
                cursor.current = data.cursor;
                setStatus(data.status === 'ok' ? 'Live' : (data.message || data.status));
                if (data.lines?.length) {
                    setLines(previous => [...previous, ...data.lines].slice(-2000));
                }
            } catch (error) {
                if (mounted) setStatus(error.toString());
            }
        };

        const startLocalDemo = async () => {
            try {
                const response = await fetch('/demo-logs.local.json', { cache: 'no-store' });
                if (!response.ok) throw new Error('Local fixture not found');
                const fixture = await response.json();
                if (!Array.isArray(fixture) || fixture.length === 0 || !fixture.every(line => typeof line === 'string')) {
                    throw new Error('Local fixture must be a non-empty array of log lines');
                }
                if (!mounted) return;
                setStatus('Demo · local fixture');
                let index = 0;
                const appendNextLine = () => {
                    setLines(previous => [...previous, withCurrentTimestamp(fixture[index])].slice(-2000));
                    index = (index + 1) % fixture.length;
                };
                appendNextLine();
                timer = window.setInterval(appendNextLine, 1500);
            } catch {
                if (mounted) startPolling();
            }
        };

        if (import.meta.env.DEV) {
            setStatus('Looking for local demo fixture…');
            startLocalDemo();
        } else {
            startPolling();
        }

        return () => { mounted = false; window.clearInterval(timer); };
    }, []);

    useEffect(() => {
        if (output.current) output.current.scrollTop = output.current.scrollHeight;
    }, [lines]);

    return (
        <section className={classes.container}>
            <div className={classes.header}><strong>Accel-PPP logs</strong><span>{status}</span></div>
            <pre className={classes.output} ref={output} aria-live="polite">
                {lines.length ? lines.join('\n') : 'Waiting for log entries…'}
            </pre>
        </section>
    );
};

export default LogsViewer;
