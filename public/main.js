// @ts-check

import { APIWrapper, API_EVENT_TYPE } from "./api.js";
import {
  addMessage,
  animateGift,
  isPossiblyAnimatingGift,
  isAnimatingGiftUI,
} from "./dom_updates.js";

const settings = {
  eliminateOldMessageDuration: 20000, //20 seconds
  displayMessageDuration: 500 //0.5 second
};

let priorityQueue = [];

const api = new APIWrapper();

api.setEventHandler(async (events) => {

  const animatedGifts = [], messages = [], gifts = [];
  const oldMessageTimeStamp = Date.now() - settings.eliminateOldMessageDuration;
  
  //Prioritize the events and merge them into main array in a single loop
  //I can use priority queue data structure but i prefer to use vanilla javascript usage so i don't depend on any third parties.
  events.forEach((event) => {
    if(event.type === API_EVENT_TYPE.ANIMATED_GIFT) {
      animatedGifts.push(event);
    }
    else if(event.type === API_EVENT_TYPE.GIFT) {
      gifts.push(event);
    }
    //Events with the type MESSAGE older than 20 seconds should not be shown to the user.
    else if(event.type === API_EVENT_TYPE.MESSAGE && event.timestamp.getTime() >= oldMessageTimeStamp) {
      messages.push(event);
    }
  });

  //Handle duplicate events. Event id should be unique
  priorityQueue = [...new Map([...priorityQueue, ...animatedGifts, ...messages, ...gifts].map(item => [item["id"], item])).values()];
});

//In order to guarantee to show an event per 500 ms we use interval.
const uiUpdateInterval = setInterval(() => {
  //If there is no event in queue return
  if (!priorityQueue.length) return;

  let currentEvent;

  //If current event is animated gift and there is no animation gift event at the moment.
  if (priorityQueue[0].type === API_EVENT_TYPE.ANIMATED_GIFT && !isAnimatingGiftUI()) 
  {
    currentEvent = priorityQueue.shift();
    addMessage(currentEvent);
    animateGift(currentEvent);
  }

  //If current event is not animated gift OR previous animated gift hasn't completed yet we switch to next non animated gift event
  else {
    
    const firstNonAnimatedEventIndex = priorityQueue.findIndex((e) => e.type !== API_EVENT_TYPE.ANIMATED_GIFT);

    if (firstNonAnimatedEventIndex != -1) {
      
      const currentEvent = priorityQueue[firstNonAnimatedEventIndex];
      priorityQueue.splice(firstNonAnimatedEventIndex, 1);
      addMessage(currentEvent);
    }
    else {
      //All events in the array are animated gifts so we have to wait...
    }
  }
}, settings.displayMessageDuration);
