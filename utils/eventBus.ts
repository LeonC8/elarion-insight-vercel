type EventCallback = (data: any) => void;

interface EventMap {
  [eventName: string]: EventCallback[];
}

class EventBus {
  private events: EventMap = {};

  public subscribe(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  public publish(event: string, data?: any): void {
    if (!this.events[event]) {
      return;
    }

    this.events[event].forEach(callback => {
      callback(data);
    });
  }
}

// Create a singleton instance
const eventBus = new EventBus();
export default eventBus; 