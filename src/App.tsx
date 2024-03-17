import React from "react";

enum ListType {
  Backlog,
  Today,
  Doing,
  Done,
}

const tasksInit: Task[] = [
  { name: "store in backend", list: ListType.Backlog },
  { name: "wait for repsonse from weronika", list: ListType.Today },
  { name: "doing", list: ListType.Doing },
  { name: "done", list: ListType.Done },
  { name: "today", list: ListType.Today },
  { name: "Zrobic pranie", list: ListType.Today },
];

function App() {
  React.useEffect(() => {
    // window.addEventListener("DOMContentLoaded", () => {
    //   // Get the element by id
    //   const elements = document.querySelectorAll(".list");
    //   elements.forEach((element) => {
    //     element.addEventListener("dragstart", function(event: any) {
    //       event.dataTransfer.setData("text/plain", event.target.id);
    //     });
    //     element.addEventListener('dragover', function(event) {
    //       event.preventDefault(); // Necessary to allow dropping
    //     });
    //   });
    // });
  }, []);

  const [tasks, setTasks] = useStickyState<Task[]>(tasksInit, "tasks");
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        lineHeight: "1.8",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
      }}
    >
      <List
        name={ListType.Backlog}
        tasks={tasks.filter((task) => task.list === ListType.Backlog)}
        setTasks={setTasks}
      />
      <List
        name={ListType.Today}
        tasks={tasks.filter((task) => task.list === ListType.Today)}
        setTasks={setTasks}
      />
      <List
        name={ListType.Doing}
        tasks={tasks.filter((task) => task.list === ListType.Doing)}
        setTasks={setTasks}
      />
      <List
        name={ListType.Done}
        tasks={tasks.filter((task) => task.list === ListType.Done)}
        setTasks={setTasks}
      />
    </div>
  );
}

export default App;

type Task = {
  name: string;
  list: ListType;
};

export const List = ({
  name,
  tasks,
  setTasks,
}: {
  name: ListType;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}) => {
  return (
    <div
      className={"list"}
      onDragOver={(event) => {
        event.preventDefault(); // Necessary to allow dropping
      }}
      onDrop={(event) => {
        const draggedTaskName = event.dataTransfer.getData("text/plain");
        setTasks((tasks) =>
          tasks.map((task) => {
            if (task.name === draggedTaskName) {
              return { ...task, list: name } as Task;
            } else {
              return task;
            }
          }),
        );
      }}
      style={{
        backgroundColor: "#eee",
        width: "20vw",
        margin: "0 10px 0 10px",
        height: "60vh",
      }}
    >
      <b style={{ marginLeft: "10px" }}>{ListType[name]}</b>
      {tasks.map((task) => {
        return <Card key={task.name} taskName={task.name} />;
      })}
    </div>
  );
};

const Card = ({ taskName }: { taskName: string }) => {
  return (
    <div
      className={"card"}
      draggable={true}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", taskName);
      }}
      style={{ backgroundColor: "#fff", margin: "10px 20px", padding: "5px" }}
    >
      {taskName}
    </div>
  );
};

function useStickyState<Type>(
  defaultValue: Type,
  key: string,
): [Type, React.Dispatch<React.SetStateAction<Type>>] {
  const [value, setValue] = React.useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null
      ? (JSON.parse(stickyValue) as Type)
      : defaultValue;
  });

  React.useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
