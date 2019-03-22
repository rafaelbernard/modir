import React, { useState, useEffect, FunctionComponent } from 'react';
import {
  IonContent,
  IonMenuToggle,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonSearchbar,
  IonSkeletonText,
  IonToolbar,
  IonIcon,
  IonButtons,
  IonButton,
} from '@ionic/react';
import Modite, { defaultModite } from '../../models/Modite';
import ListItemProps from '../../models/ListItemProps';
import WorkerEvent from '../../models/WorkerEvent';
import FilterEvent from '../../models/FilterEvent';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
// @ts-ignore
import AutoSizer from 'react-virtualized-auto-sizer';
// @ts-ignore
import Worker from 'worker-loader!./formatModites.js';
import s from './styles.module.css';
import ModiteImage from '../ModiteImage';
import ModiteListProps from '../../models/ModiteListProps';
import ModiteProfileResp from '../../models/ModiteProfileResp';

// get locale once
const locale: string = navigator.language;

// reference to the worker that formats and filters modite data
const worker: Worker = new Worker();

// keep server response here for future reference
let rawModites: Modite[];

// get data from server
async function getData(filter: string, date: Date): Promise<void> {
  rawModites = await fetch('https://modus.app/modites/all').then(res => res.json());
  worker.postMessage({ modites: rawModites, filter, date, locale });
}

const ListItem: FunctionComponent<ListItemProps> = ({ style, modite, activeModite, onItemClick = () => {} }) => {
  const handleItemClick = async (): Promise<void> => {
    if (modite.id !== activeModite.id) {
      onItemClick(defaultModite);
      const moditeProfile: ModiteProfileResp = await fetch(`https://modus.app/modite/${modite.id}`).then(res => res.json());
      if (moditeProfile.ok) modite.profile = moditeProfile.profile;
      onItemClick(modite);
    }
  };

  return (
    <IonMenuToggle key={modite.id} auto-hide="false" style={style}>
      <IonItem button class={s.appear} onClick={handleItemClick}>
        <IonThumbnail slot="start" class={s.thumbnailContainer}>
          <ModiteImage modite={modite}/>
        </IonThumbnail>

        <IonLabel>{modite.real_name}</IonLabel>
        <IonLabel class={s.tod}>{modite.tod}</IonLabel>
        <IonLabel class={s.time}>{modite.localTime}</IonLabel>
      </IonItem>
    </IonMenuToggle>
  );
};

const SkeletonList: FunctionComponent<{}> = () => (
  <>
    {Array.from(new Array(10)).map((_, index) => (
      <IonItem key={index}>
        <IonThumbnail slot="start" class={s.thumbnailContainer}>
          <IonSkeletonText />
        </IonThumbnail>

        <IonLabel>
          <IonSkeletonText style={{ width: `${Math.random() * 30 + 50}%` }} />
        </IonLabel>
        <IonLabel class={s.tod}>
          <IonSkeletonText style={{ width: '60%' }} />
        </IonLabel>
        <IonLabel class={s.time}>
          <IonSkeletonText style={{ width: '80%' }} />
        </IonLabel>
      </IonItem>
    ))}
  </>
);

function ModiteList({ onModiteItemClick, slides, activeModite, toggleShowGlobe }: ModiteListProps) {
  const [modites, setModites] = useState();
  const [filter, setFilter] = useState('');
  const [date, setDate] = useState(new Date());

  // get fresh time
  const tick: Function = (): void => setDate(new Date());

  const onFilter = (event: FilterEvent): void => {
    const query: string = event.detail.value || '';

    // save filter
    setFilter(query);

    //tell worker to parse and filter
    worker.postMessage({
      modites: rawModites,
      filter: query,
      date,
      locale,
    });
  };

  // handles clicks on the list of Modites and shows the details view for the clicked Modite
  const handleListClick = (e: any): void => {
    slides.current.slideNext();
  };

  const ModiteListItem: FunctionComponent<ListChildComponentProps> = ({ index, style }) => (
    <ListItem list={modites} filter={filter} date={date} style={style} modite={modites[index]} onItemClick={onModiteItemClick} activeModite={activeModite} />
  );

  const Skeleton: FunctionComponent<ListChildComponentProps> = () => <SkeletonList />;

  useEffect(() => {
    // start the clock
    const intervalID: number = window.setInterval(tick, 1000 * 60);
    const clearTimeInterval = (): void => clearInterval(intervalID);

    // if we already have something, we can safely abandon fetching
    if (modites) {
      if (modites.length) return clearTimeInterval;
    } else {
      // initial data parsing
      worker.onmessage = (event: WorkerEvent) => setModites(event.data);
      // get data from the api
      getData(filter, date);
    }
  });

  return (
    <>
      <IonToolbar>
        <IonSearchbar debounce={200} value={filter} placeholder="Filter Modites" onIonChange={onFilter} class={s.slideInDown} />
        <IonButtons slot="end">
          <IonButton onClick={() => toggleShowGlobe()}>
            <IonIcon class={`${s.worldMapButton} ${s.slideInDown}`} slot="icon-only" ios="md-globe" md="md-globe" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
      <IonContent onClick={handleListClick}>
        <AutoSizer>
          {({ height, width }: { height: number; width: number }) => (
            <List height={height} itemCount={(modites && modites.length) || 10} itemSize={72} width={width}>
              {modites && modites.length ? ModiteListItem : Skeleton}
            </List>
          )}
        </AutoSizer>
      </IonContent>
    </>
  );
}

export default ModiteList;
