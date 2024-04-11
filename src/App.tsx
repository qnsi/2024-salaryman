import React, { FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";

console.log(process.env);
if (
  !process.env.REACT_APP_SUPABASE_URL ||
  !process.env.REACT_APP_SUPABASE_KEY
) {
  throw new Error(
    "REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY must be defined in .env",
  );
}
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || "",
  process.env.REACT_APP_SUPABASE_KEY || "",
);

enum ListType {
  Backlog,
  Today,
  Doing,
  Done,
}

function App() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [filterText, setFilterText] = React.useState("");
  const [selectedTasks, setSelectedTasks] = React.useState<number[]>([0]);

  React.useEffect(() => {
    getTasks();
  }, []);

  const refetchData = () => {
    getTasks();
  };
  // taskToTasks!public_taskToTasks_parent_id_fkey(tasks!taskToTasks(id))

  async function getTasks() {
    const { data } = await supabase.from("tasks").select(`id, text,
    taskToTasks!child_id(parent_id)
    `);
    console.log(data);
    if (data) {
      setTasks(
        data.map((task) => {
          return {
            id: task.id,
            name: task.text,
            parents: task.taskToTasks.map((parent: any) => parent.parent_id),
          } as Task;
        }),
      );
    }
  }

  async function createTask(newTask: Task, parentId: number) {
    console.log("createTask: newTask: ", newTask);
    const { data: tasks, error } = await supabase
      .from("tasks")
      .insert({ text: newTask.name })
      .select();
    // handleError
    if (parentId !== 0 && tasks && tasks[0]) {
      const { error } = await supabase
        .from("taskToTasks")
        .insert({ parent_id: parentId, child_id: tasks[0].id });
    }
    console.log("error: ", error);
    refetchData();
  }

  async function updateTask(taskId: number, newTask: Task) {
    console.log("updateTask: taskId: ", taskId, " newTask: ", newTask);
    const { error } = await supabase
      .from("tasks")
      .update({ text: newTask.name })
      .eq("id", taskId);
    // handleError
    console.log("error: ", error);
    refetchData();
  }

  async function deleteTask(taskId: number) {
    console.log("delete task: taskId: ", taskId);
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    // handleError
    console.log("error: ", error);
    refetchData();
  }

  React.useEffect(() => {
    console.log("tasks", tasks);
  }, [tasks]);

  // const filteredTasks = tasks.filter((task) => {
  //   return task.name.toLowerCase().includes(filterText.toLowerCase());
  // });
  //
  const rootTasks = tasks.filter((task) => task.parents.length === 0);

  return (
    <>
      <input
        type="text"
        value={filterText}
        onChange={(e) => setFilterText(e.currentTarget.value)}
      />
      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          lineHeight: "1.8",
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
        }}
      >
        {selectedTasks.map((selectedTaskId) => {
          const childTasks =
            selectedTaskId === 0
              ? rootTasks
              : tasks.filter((task) => task.parents.includes(selectedTaskId));
          return (
            <List
              parentId={selectedTaskId}
              tasks={childTasks}
              createTask={createTask}
              updateTask={updateTask}
              deleteTask={deleteTask}
              setSelectedTasks={setSelectedTasks}
            />
          );
        })}
      </div>
    </>
  );
}

export default App;

type Task = {
  id: number;
  name: string;
  parents: Array<number>;
};

export const List = ({
  parentId,
  tasks,
  updateTask,
  createTask,
  deleteTask,
  setSelectedTasks,
}: {
  parentId: number;
  tasks: Task[];
  updateTask: (taskId: number, newTask: Task) => void;
  createTask: (newTask: Task, parentId: number) => void;
  deleteTask: (taskId: number) => void;
  setSelectedTasks: React.Dispatch<React.SetStateAction<number[]>>;
}) => {
  return (
    <div
      className={"list"}
      // onDragOver={(event) => {
      //   event.preventDefault(); // Necessary to allow dropping
      // }}
      // onDrop={(event) => {
      //   const draggedTaskId = event.dataTransfer.getData("text/plain");
      //   const task = tasks.find((task) => task.id === Number(draggedTaskId));
      //   console.log("onDrop: task: ", task);
      //   if (task) updateTask(task.id, { ...task, list: listType });
      // }}
      style={{
        backgroundColor: "#eee",
        width: "20vw",
        margin: "0 10px 0 10px",
        padding: "10px",
        borderRadius: "10px",
      }}
    >
      {tasks.map((task) => {
        return (
          <Card
            key={task.name}
            task={task}
            updateTask={updateTask}
            deleteTask={deleteTask}
            setSelectedTasks={setSelectedTasks}
            parentId={parentId}
          />
        );
      })}
      <NewTaskCard
        createTask={(text) => createTask({ name: text } as Task, parentId)}
      />
    </div>
  );
};

const Card = ({
  task,
  updateTask,
  deleteTask,
  setSelectedTasks,
  parentId,
}: {
  task: Task;
  updateTask: (taskId: number, newTask: Task) => void;
  deleteTask: (taskId: number) => void;
  setSelectedTasks: React.Dispatch<React.SetStateAction<number[]>>;
  parentId: number;
}) => {
  const [editMode, setEditMode] = React.useState(false);
  const [taskText, setTaskText] = React.useState(task.name);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState(false);
  const [hover, setHover] = React.useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateTask(task.id, { ...task, name: taskText });
    setEditMode(false);
  };

  const handleDelete = () => {
    deleteTask(task.id);
    setDeleteConfirmation(false);
  };

  const handleClick = () => {
    console.log("parentId: ", parentId);
    setSelectedTasks((taskIds) => {
      console.log("taskIds: ", taskIds);
      const index = taskIds.indexOf(parentId);
      const subArray = taskIds.slice(0, index + 1);
      return subArray.concat([task.id]);
    });
  };

  const handleEdit = () => {
    setEditMode(true);
    setHover(false);
  };

  return editMode ? (
    <form onSubmit={handleSubmit}>
      <input
        style={{
          margin: "10px 20px",
          padding: "5px",
          width: "70%",
        }}
        autoFocus={true}
        value={taskText}
        onChange={(e) => setTaskText(e.target.value)}
        onBlur={() => setEditMode(false)}
        type="text"
      />
    </form>
  ) : (
    <div
      style={{
        margin: "10px 20px",
      }}
    >
      <div
        className={"card"}
        draggable={true}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", `${task.id}`);
        }}
        style={{
          width: "70%",
          backgroundColor: "#fff",
          display: "flex",
          justifyContent: "space-between",
          lineHeight: 1.2,
          padding: "5px",
          fontSize: 13,
          borderRadius: "5px",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <p onClick={handleClick} style={{ margin: "0px" }}>
          {task.name}
        </p>
        {hover && (
          <div>
            {deleteConfirmation ? (
              <>
                <button onClick={handleDelete}>Y</button> |
                <button onClick={() => setDeleteConfirmation(false)}>N</button>
              </>
            ) : (
              <button onClick={() => setDeleteConfirmation(true)}>X</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const NewTaskCard = ({
  createTask,
}: {
  createTask: (text: string) => void;
}) => {
  const [editMode, setEditMode] = React.useState(false);
  const [newTaskText, setNewTaskText] = React.useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // TODO: sent listType
    createTask(newTaskText);
    setNewTaskText("");
  };

  return editMode ? (
    <form onSubmit={handleSubmit}>
      <input
        style={{
          margin: "10px 20px",
          padding: "5px",
          display: "block",
        }}
        autoFocus={true}
        onChange={(e) => setNewTaskText(e.target.value)}
        onBlur={() => setEditMode(false)}
        type="text"
      />
    </form>
  ) : (
    <button
      className={"newTaskCard"}
      style={{
        backgroundColor: "#fff",
        margin: "10px 20px",
        padding: "5px",
        display: "block",
      }}
      onClick={() => setEditMode(true)}
    >
      + Add new task
    </button>
  );
};
