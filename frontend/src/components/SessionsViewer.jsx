import React, { useEffect, useState } from 'react';

import ReactDataGrid from '@inovua/reactdatagrid-community';
import '@inovua/reactdatagrid-community/index.css';
import '@inovua/reactdatagrid-community/theme/default-dark.css';

import TrafficModal from './TrafficModal';

import { renderSessionContextMenu } from '../utils/ui/renderSessionContextMenu'

import classes from './SessionsViewer.module.css'

const SessionsViewer = ({ columns, sessions, filterValue, privileges, loadSessions, gridSettings }) => {
    const [selectedSessions, setSelectedSessions] = useState({}) // selected sessions (to save selected sessions on reload)
    const [trafficModal, setTrafficModal] = useState({ open: false, ses: {} })
    const [isDarkTheme, setIsDarkTheme] = useState(() => document.documentElement.dataset.theme === 'synthwave')

    useEffect(() => {
        const themeObserver = new MutationObserver(() => {
            setIsDarkTheme(document.documentElement.dataset.theme === 'synthwave')
        })
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
        return () => themeObserver.disconnect()
    }, [])

    return (
        <>
            <ReactDataGrid
                idProperty="ke" /* key (bras+sid) */
                columns={columns}
                dataSource={sessions.hasOwnProperty('sessions') ? sessions['sessions'] : []} // session list
                defaultFilterValue={filterValue}
                renderRowContextMenu={(menuProps, other) => renderSessionContextMenu(privileges, loadSessions, trafficModal, setTrafficModal, menuProps, other)}
                showColumnMenuGroupOptions={false} /* non-free feature, doesn't work in community version */
                showColumnMenuLockOptions={false} /* non-free feature, doesn't work in community version */
                enableColumnAutosize={false} /* non-free feature, doesn't work in community version */
                showColumnMenuFilterOptions={false}
                enableFiltering={true}
                columnUserSelect={true}
                className={classes.Grid}
                selected={selectedSessions}
                onSelectionChange={({ selected }) => { setSelectedSessions(selected) }}
                {...gridSettings}
                theme={isDarkTheme ? 'default-dark' : 'default-light'}
            />
            {trafficModal.open ?
                <TrafficModal modal={trafficModal} setModal={setTrafficModal} /> :
                ''
            }
        </>
    );
};

export default SessionsViewer;
